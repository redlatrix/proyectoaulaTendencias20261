import subprocess
import sys
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

TEST_USERNAME = "test_selenium"
TEST_PASSWORD = "TestUI_2024!"

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


@pytest.fixture(scope="session", autouse=True)
def seed_test_user():
    """Crea el usuario de prueba en la BD antes de correr los tests."""
    result = subprocess.run(
        [sys.executable, "manage.py", "seed_test_user"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.exit(f"seed_test_user falló:\n{result.stderr}", returncode=1)
    print(f"\n[seed] {result.stdout.strip()}")


@pytest.fixture(scope="session")
def driver(seed_test_user):
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(10)

    yield driver

    driver.quit()
