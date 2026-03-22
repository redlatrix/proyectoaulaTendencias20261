from rest_framework import serializers

from .models import Assignment, Resource, ResourceStatus, ResourceType


class ResourceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceType
        fields = "__all__"


class ResourceSerializer(serializers.ModelSerializer):
    type = serializers.PrimaryKeyRelatedField(
        queryset=ResourceType.objects.all(),
        error_messages={
            "does_not_exist": "El tipo de recurso no existe.",
            "incorrect_type": "El tipo de recurso debe enviarse como un ID valido.",
        },
    )
    type_name = serializers.CharField(source="type.name", read_only=True)
    has_active_assignment = serializers.BooleanField(read_only=True)

    class Meta:
        model = Resource
        fields = (
            "id",
            "name",
            "code",
            "type",
            "type_name",
            "technical_description",
            "acquisition_date",
            "value",
            "status",
            "responsible_area",
            "has_active_assignment",
        )
        extra_kwargs = {
            "code": {"required": True},
            "type": {"required": True, "allow_null": False},
            "responsible_area": {"required": True},
        }

    def validate(self, attrs):
        if self.instance is None and attrs.get("status", ResourceStatus.AVAILABLE) != ResourceStatus.AVAILABLE:
            raise serializers.ValidationError(
                {"status": "El estado inicial de un recurso debe ser AVAILABLE."}
            )

        resource = self.instance
        target_status = attrs.get("status")

        if resource and target_status == ResourceStatus.AVAILABLE and resource.has_active_assignment:
            raise serializers.ValidationError(
                {"status": "Un recurso asignado no puede marcarse como AVAILABLE."}
            )

        return attrs

    def create(self, validated_data):
        validated_data["status"] = ResourceStatus.AVAILABLE
        return super().create(validated_data)


class AssignmentSerializer(serializers.ModelSerializer):
    resource_code = serializers.CharField(source="resource.code", read_only=True)
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = (
            "id",
            "resource",
            "resource_code",
            "assignee",
            "assignee_name",
            "start_date",
            "expected_return_date",
            "returned_at",
            "notes",
        )

    def get_assignee_name(self, obj):
        if obj.assignee:
            return obj.assignee.get_full_name() or obj.assignee.username
        return None

    def validate(self, attrs):
        instance = self.instance
        resource = attrs.get("resource") or (instance.resource if instance else None)
        start_date = attrs.get("start_date") or (instance.start_date if instance else None)
        expected_return_date = attrs.get("expected_return_date")
        returned_at = attrs.get("returned_at")

        if resource and resource.status in {ResourceStatus.MAINTENANCE, ResourceStatus.RETIRED}:
            raise serializers.ValidationError(
                {"resource": "No se puede asignar un recurso en mantenimiento o dado de baja."}
            )

        if expected_return_date and start_date and expected_return_date < start_date:
            raise serializers.ValidationError(
                {"expected_return_date": "La fecha esperada no puede ser menor al inicio."}
            )

        if returned_at and start_date and returned_at < start_date:
            raise serializers.ValidationError(
                {"returned_at": "La fecha de devolucion no puede ser menor al inicio."}
            )

        if instance is None and resource and resource.has_active_assignment:
            raise serializers.ValidationError(
                {"resource": "Este recurso ya tiene una asignacion activa."}
            )

        return attrs

    def create(self, validated_data):
        assignment = super().create(validated_data)

        if assignment.returned_at is None and assignment.resource.status != ResourceStatus.MAINTENANCE:
            assignment.resource.status = ResourceStatus.ASSIGNED
            assignment.resource.save(update_fields=["status"])

        return assignment

    def update(self, instance, validated_data):
        assignment = super().update(instance, validated_data)

        if assignment.returned_at and assignment.resource.status == ResourceStatus.ASSIGNED:
            assignment.resource.status = ResourceStatus.AVAILABLE
            assignment.resource.save(update_fields=["status"])

        return assignment
