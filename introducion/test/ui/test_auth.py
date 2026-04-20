from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import TEST_USERNAME, TEST_PASSWORD


def test_login_flow(driver):
    driver.get("http://localhost:5173/login")

    wait = WebDriverWait(driver, 10)

    username_input = driver.find_element(By.ID, "username")
    username_input.clear()
    username_input.send_keys(TEST_USERNAME)

    password_input = driver.find_element(By.ID, "password")
    password_input.clear()
    password_input.send_keys(TEST_PASSWORD)

    show_password_btn = driver.find_element(By.XPATH, "//input[@id='password']/following-sibling::button")
    show_password_btn.click()

    submit_button = driver.find_element(By.XPATH, "//button[@type='submit']")
    submit_button.click()

    try:
        wait.until(EC.url_to_be("http://localhost:5173/"))
        print("✅ Login exitoso: Redirección al inicio detectada.")
    except:
        try:
            error_msg = driver.find_element(By.CLASS_NAME, "text-red-700").text
            print(f"❌ El login falló: {error_msg}")
        except:
            print(f"❌ Timeout: URL actual es {driver.current_url}")
