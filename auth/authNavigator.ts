import BasePage from '../base/basePage';

class AuthNavigator extends BasePage {

    async login(page, username, otp){
        await super.navigateTo(page, '/');
        await super.enterValueInTextField(page, "Enter Work Email", username);
        await super.clickOnAButton(page, "Continue");
        await this.enterOTP(page, otp);
    }

    async enterOTP(page, otp){
        await page.locator('#otp input').first().waitFor({ state: 'visible' });
        const inputs = await page.locator('#otp input');
        for (let i = 0; i < otp.length; i++) {
          const input = inputs.nth(i);
          await input.fill(otp[i]);
        }
    }

    async clickOnProfileIcon(page){
        await this.commonPage.waitForPageToLoad(page);
        await page.locator(`.logout-container`).waitFor({ state: 'visible' });
        await page.locator(`.logout-container`).click();
    }

    async switchToProduct(page, productName: 'Talent' | 'Sales') {
        await super.navigateTo(page, `/`);
        await this.clickOnProfileIcon(page);
        const productLinks = page.locator(`.logout-container a.switch-product`);
        await productLinks.waitFor({ state: 'visible' });
        const productLink = page.locator('.logout-container a.switch-product').getByText(`Switch to ${productName} Product`, { exact: true });
        if (await productLink.isVisible()) {
          await productLink.click();
          console.log(`Switch to ${productName} Product`);
        }
        else{
          console.log(`Is in ${productName} Product`)
        }
        await this.commonPage.waitForPageToLoad(page);
      }   

}

export default AuthNavigator;