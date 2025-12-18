// Dont make any changes in this File
// Reference from : http://storybook.draup.technology/?path=/story/components-toggle--draup-toggle

import CommonPage from "./commonPage";

class BasePage {
  protected commonPage: CommonPage;

  constructor() {
    this.commonPage = new CommonPage();
  }

  // ===== Navigation =====
  async navigateTo(page, url) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    this.commonPage.consoleLog(`Navigate: '${url}'`);
  }

  // ===== Basic Interactions =====
  async getButtonLocator(page, buttonName) {
    await this.commonPage.waitForPageToLoad(page);
    return await this.commonPage.getButtonLocator(page, buttonName);
  }

  async clickOnAButton(page, buttonName) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickButton(page, buttonName);
  }

  async enterValueInTextField(page, fieldName: string, value: string) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.valueInTextBox(page, fieldName, value);
  }

  async clickOnTextLink(page, linkName: string, container?: "left" | "right") {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickTextLink(page, linkName, container);
  }

  async getIconLocator(page, iconName) {
    await this.commonPage.waitForPageToLoad(page);
    return await this.commonPage.getIconLocator(page, iconName);
  }

  async clickOnIcon(page, iconName, index?) {
    await this.commonPage.clickIcon(page, iconName, index);
  }

  async getRowValuesInText(page, fieldName?) {
    await this.commonPage.waitForPageToLoad(page);
    return await this.commonPage.getRowValuesInText(page, fieldName);
  }

  async clickOnActionsInGrid(page, actionName, fieldName?) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickActionsInGrid(page, actionName, fieldName);
  }

  async searchGridByValue(page, value) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.searchGridByValue(page, value);
  }

  async clickOnKeyBoardAction(page, actionName) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickKeyboardAction(page, actionName);
  }

  async selectSearchGridOption(page, optionName?) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.selectSearchGridOption(page, optionName);
  }

  async clickOnToggleSwitch(page, toggleName) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickToggleSwitch(page, toggleName);
    await this.commonPage.waitForPageToLoad(page);
  }

  async clickOnFiltersBasedOnLabel(page, label, actionName?) {
    await this.commonPage.waitForPageToLoad(page);
    const { filterSelector, value } = await this.commonPage.hoverFilterBasedOnLabel(page, label, actionName);
    this.commonPage.consoleLog(
      `Filter: Click on ${
        value == 1 ? await filterSelector.innerText() : actionName
      } with Label Name as ${label}`
    );
    await filterSelector.click();
  }

  async clickOnTabsDropdown(page) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickTabsDropdown(page);
  }

  async clickOnNav(page, tabName) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickNav(page, tabName);
  }

  async clickOnTab(page, tabName) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickTab(page, tabName);
  }

  async clickOnGlobalSearch(page, searchText) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickGlobalSearch(page, searchText);
  }

  async clickOnExactText(page, text) {
    await this.commonPage.clickExactText(page, text);
  }

  async clickOnNonExactText(page, text) {
    await this.commonPage.clickNonExactText(page, text);
  }

  async clickOnDropdownToggleContent(page, placeholder) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickDropdownToggleContent(page, placeholder);
  }

  async getDropdownOptionText(page, optionName?, count?){
    await this.commonPage.waitForPageToLoad(page);
    const option = await this.commonPage.getDropdownOptionLocator(page, optionName, count);
    return (await option.innerText()).split('\n')[0];
  }

  async selectDropdownOption(page, optionName?){
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.selectDropdownOption(page, optionName);
  }

  // ===== Popup =====
  async clickOnSearchInPopup(page, searchText) {
    await this.commonPage.waitForPageToLoad(page);
    await this.commonPage.clickOnSearchInPopup(page, searchText);
  }

  // This should be false if the field is visible
  async hasInvalidValues(page, fieldName?) {
    const values = await this.getRowValuesInText(page, fieldName) 
    // Ensure we have an array to work with
    if (!Array.isArray(values) || values.length === 0) return true;
  
    return values.some((v) => {
      if (v == null) return true; // null or undefined
      if (typeof v !== "string") v = String(v); // convert numbers, booleans, etc. to string
      const trimmed = v.trim();
      return trimmed === "" || trimmed === "[object Object]";
    });
  }  

  async closeModal(page){
    await this.clickOnIcon(await this.commonPage.modalContentSelector(page), "Cross");
    await page.waitForLoadState('networkidle');
  }

  // ===== Returns date in a given format (default: "DD MMM YYYY") ===== MM/DD/YYYY - 10/21/2000
  // ===== Returns a formatted date for "today", "yesterday", "tomorrow", or relative days (e.g., "today+3", "today-5") =====
  formatDate(dateValue, format = "DD MMM YYYY") {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    let date = new Date();

    // Normalize input
    const value = dateValue.toLowerCase().replace(/\s+/g, "");

    if (value === "today") {
      // do nothing, already today
    } else if (value === "yesterday") {
      date.setDate(date.getDate() - 1);
    } else if (value === "tomorrow") {
      date.setDate(date.getDate() + 1);
    } else if (value.startsWith("today+")) {
      const offset = parseInt(value.split("+")[1], 10);
      if (!isNaN(offset)) date.setDate(date.getDate() + offset);
    } else if (value.startsWith("today-")) {
      const offset = parseInt(value.split("-")[1], 10);
      if (!isNaN(offset)) date.setDate(date.getDate() - offset);
    } else {
      throw new Error(
        `Invalid date keyword: ${dateValue}. Use "today", "yesterday", "tomorrow", or "today±N".`
      );
    }

    // Components
    const DD = date.getDate().toString().padStart(2, "0");
    const D = date.getDate().toString();
    const MM = (date.getMonth() + 1).toString().padStart(2, "0");
    const M = (date.getMonth() + 1).toString();
    const MMM = monthNames[date.getMonth()];
    const YYYY = date.getFullYear().toString();

    // Replace tokens in the format string
    const formattedDate = format
      .replace("YYYY", YYYY)
      .replace("MMM", MMM)
      .replace("MM", MM)
      .replace("DD", DD)
      .replace("M", M)
      .replace("D", D);

    return formattedDate;
  }

  generateRandomString(length = 8) {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  generateRandomMobileNumber() {
    const prefix = ["6", "7", "8", "9"][Math.floor(Math.random() * 4)];
    let number = prefix;
    for (let i = 0; i < 9; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }

  generateRandomEmail() {
    const randomStr = this.generateRandomString(6);
    return `user_${randomStr}@testmail.com`;
  }
}

export default BasePage;
