from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_crear_tipo_recurso(driver):
    driver.get("http://localhost:5173/tipos-recurso")

    wait = WebDriverWait(driver, 10)

    btn_nuevo = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(), 'Nuevo tipo')]")
    ))
    btn_nuevo.click()

    nombre = wait.until(EC.visibility_of_element_located(
        (By.CSS_SELECTOR, "input[placeholder='Ej: Computador portátil']")
    ))
    nombre.send_keys("Laptop Gamer")

    dropdown = Select(driver.find_element(By.TAG_NAME, "select"))
    dropdown.select_by_visible_text("Físico")

    desc = driver.find_element(By.TAG_NAME, "textarea")
    desc.send_keys("Equipos de alto rendimiento para desarrollo")

    btn_guardar = driver.find_element(By.XPATH, "//button[contains(text(), 'Crear tipo')]")
    btn_guardar.click()

    wait.until(EC.invisibility_of_element_located((By.XPATH, "//button[contains(text(), 'Crear tipo')]")))
    print("✅ Tipo de recurso creado exitosamente.")


def test_crear_recurso_nuevo(driver):
    driver.get("http://localhost:5173/recursos")

    wait = WebDriverWait(driver, 10)

    btn_nuevo = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(), 'Nuevo recurso')]")
    ))
    btn_nuevo.click()

    nombre_input = wait.until(EC.visibility_of_element_located(
        (By.CSS_SELECTOR, "input[placeholder='Nombre del recurso']")
    ))
    nombre_input.send_keys("MacBook Pro")

    input_codigo = driver.find_element(By.CSS_SELECTOR, "input[placeholder='Ej: LAP-001']")
    input_codigo.send_keys("MAC-2024-001")

    tipo_select = Select(driver.find_element(
        By.XPATH, "//label[contains(text(), 'Tipo de recurso')]/following-sibling::select"
    ))
    tipo_select.select_by_index(1)

    driver.find_element(By.CSS_SELECTOR, "input[placeholder='Ej: Tecnología']").send_keys("Sistemas")

    driver.find_element(By.CSS_SELECTOR, "input[type='date']").send_keys("20042024")
    driver.find_element(By.CSS_SELECTOR, "input[type='number']").send_keys("5500000")

    driver.find_element(By.TAG_NAME, "textarea").send_keys("M3 Pro, 18GB RAM, 512GB SSD")

    msg_estado = driver.find_element(By.CLASS_NAME, "bg-emerald-50").text
    assert "Disponible" in msg_estado

    driver.find_element(By.XPATH, "//button[contains(text(), 'Crear recurso')]").click()

    wait.until(EC.invisibility_of_element_located((By.XPATH, "//button[contains(text(), 'Crear recurso')]")))
    print("✅ Recurso creado exitosamente.")
