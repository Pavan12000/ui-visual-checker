// Dont make any changes in this File
// Reference from : http://storybook.draup.technology/?path=/story/components-toggle--draup-toggle

import { ActionElement } from "./actionElements";

class CommonPage {
  private actionElement: ActionElement;

  constructor() {
    this.actionElement = new ActionElement();
  }

  consoleLog(value: string) {
    console.log(`STEP | ${value}`);
  }

  async addCustomRowIndexToGrid(page) {
    await page.evaluate(() => {
      document.querySelectorAll("div .react-grid-Row").forEach((el, index) => {
        el.setAttribute("rowindex", `${index + 1}`); // creates rowindex="1", rowindex="2", etc.
      });
    });
  }

  async getRowIndex(page, fieldName) {
    const rowIndexLocator = page
      .locator(".react-grid-Viewport .react-grid-Row")
      .filter({ hasText: fieldName })
      .first();
    await rowIndexLocator.waitFor({ state: "visible", timeout: 10000 });
    await rowIndexLocator.scrollIntoViewIfNeeded();
    await this.addCustomRowIndexToGrid(page);
    const rowIndex = await rowIndexLocator.getAttribute("rowindex");
    return `.react-grid-Viewport [rowindex="${rowIndex}"]`;
  }

  // async getLeftValueBasedOnHeading(columnHeading){
  //     const headers = document.querySelectorAll<HTMLElement>('.react-grid-HeaderCell');
  //     const obj: Record<string, string> = {};
  //     headers.forEach((cell: HTMLElement) => {
  //     const headingEl = cell.querySelector<HTMLElement>('.text-ellipsis');
  //     if (!headingEl || !headingEl.textContent) return;
  //     const heading = headingEl.textContent.trim();
  //     const left = cell.style.left || '';
  //     obj[heading] = left;
  //     });
  //     return obj[columnHeading];
  // }

  async waitForPageToLoad(page) {
    await page.waitForLoadState("load");
    await page.waitForLoadState("networkidle");
  }

  async modalContentSelector(page) {
    return await page.locator(`.modal-content`);
  }

  async popupContentSelector(page) {
    return await page.locator(`.popover-content`);
  }

  // ===== Basic Interactions =====
  async getButtonLocator(page, buttonName) {
    let button;
    try {
      button = page.getByRole("button", { name: buttonName })
    } catch {
      button = page.getByRole("button", { name: new RegExp(buttonName, "i") });
    }
    return button;
  }

  async clickButton(page, buttonName) {
    const button = await this.getButtonLocator(page, buttonName);
    await page.waitForLoadState("domcontentloaded");
    await button.first().waitFor({ state: "visible" });
    await button.first().click();
    this.consoleLog(`Button: Click on '${buttonName}'`);
  }

  async valueInTextBox(page, fieldName: string, value: string) {
    const textContainer = page
      .locator(".text-area-container")
      .or(page.locator(".text-field-container"));
    const textBoxTitle = textContainer.locator(
      "//*[contains(@class,'title')]//ancestor::*[contains(@class,'header-container')]"
    );
    const labelLocator = page.locator("label", {
      hasText: fieldName,
      exact: true,
    });
    const locator = textBoxTitle.locator(`//following-sibling::*[@placeholder='${fieldName}' or text()='${fieldName}']`)
      .or(page.getByRole("textbox", { name: fieldName, exact: true }))
      .or(labelLocator.getByRole("textbox", { name: fieldName, exact: true }))
      .or(page.locator(`//*[contains(@class, "editable-input") and @placeholder='${fieldName}']`));
    await locator.first().waitFor({ state: "visible" });
    await locator.first().scrollIntoViewIfNeeded();
    await locator.first().click();
    await locator.first().fill(value);
    this.consoleLog(`Field: Enter '${value}' in '${fieldName}'`);
  }

  async clickTextLink(page, linkName: string, container?: "left" | "right") {
    const containerLocator = container == "left"
        ? page.locator(".left", { hasText: linkName })
        : container == "right"
        ? page.locator(".right", { hasText: linkName })
        : page;
    const linkLocator = containerLocator
      .locator(".common-link", { hasText: linkName })
      .or(containerLocator.locator(".button-label", { hasText: linkName }));
    await linkLocator.first().scrollIntoViewIfNeeded();
    await linkLocator.first().waitFor({ state: "visible", timeout: 10000 });
    await linkLocator.first().click();
    this.consoleLog(`Textlink: Click on '${linkName}'`);
  }

  async getIconLocator(page, iconName, index = 1) {
    const iconLocator = page.locator(`//*[contains(@class,"new-icon-wrapper")]//*[contains(@style,"${iconName}")]`)
      .nth(index - 1);
    try{
        await iconLocator.waitFor({ state: "visible", timeout: 10000 });
        await iconLocator.scrollIntoViewIfNeeded();
    }
    catch{
        this.consoleLog(`Icon is not visible`)
    }
    return iconLocator;
  }

  async clickIcon(page, iconName, index?) {
    const iconLocator = await this.getIconLocator(page, iconName, index);
    await iconLocator.click();
    this.consoleLog(`Icon: Click on '${iconName}'`);
  }

  // returns an array of texts
  async getRowValuesInText(page, fieldName?) {
    const rowSelector = fieldName ? await this.getRowIndex(page, fieldName) : `.react-grid-Viewport .react-grid-Row`;
    const cells = page.locator(`${rowSelector} [tabindex="0"]`);
    await cells.first().waitFor({ state: "visible" });
    return await cells.allInnerTexts();
  }

  async clickActionsInGrid(page, actionName, fieldName?) {
    const rowIndexSelector = await page.locator(
      await this.getRowIndex(page, fieldName)
    );
    if (actionName.toLowerCase() == "checkbox")
      return (actionName = "nobulkcheckboxingrid");
    if (!isNaN(fieldName) && !isNaN(parseFloat(fieldName))) {
      for (let i = 0; i < fieldName; i++) {
        const checkBox = rowIndexSelector
          .locator(this.actionElement.getActionElement(actionName))
          .nth(i);
        await checkBox.scrollIntoViewIfNeeded();
        await checkBox.waitFor({ state: "visible" });
        await checkBox.click();
      }
    } else if (actionName == "bulkcheckbox") {
      const bulkSelectSelector = page.locator(".bulk-select-container .checkbox-container").first()
        .or(page.locator(".fast-actions-holder .checkbox-container").first());
      await bulkSelectSelector.scrollIntoViewIfNeeded();
      await bulkSelectSelector.waitFor({ state: "visible" });
      await bulkSelectSelector.click();
    } else {
      const textCell = await rowIndexSelector.locator(`[value="${fieldName}"]`)
      await textCell.scrollIntoViewIfNeeded();
      await textCell.waitFor({ state: "visible" });
      await textCell.hover()
      const actionCell = await textCell.locator(this.actionElement.getActionElement(actionName)).first();
      await actionCell.waitFor({ state: "visible" });
      await actionCell.click();
    }
    this.consoleLog(`Grid: Click on ${actionName} `);
  }

  async searchGridByValue(page, value) {
    const locator = page.locator(`.autosuggest-search-holder input`).first();
    await locator.waitFor({ state: "visible" });
    await locator.click();
    await locator.fill(value);
    this.consoleLog(`Grid: Enter '${value}' in Search`);
  }

  async clickOnSearchInPopup(page, value) {
    const locator = (await this.popupContentSelector(page)).locator(`[placeholder*="Search"]`).first();
    await locator.waitFor({ state: "visible" });
    await locator.click();
    await page.keyboard.type(value, { delay: 100 });
    this.consoleLog(`Search: Enter '${value}' in Search`);
  }

  async clickKeyboardAction(page, actionName) {
    await page.keyboard.press(actionName);
    this.consoleLog(`Keyboard: Click on ${actionName}`);
  }

  async selectSearchGridOption(page, optionName?) {
    const optionSelector = await page.locator(`[role="option"] .search-option`);
    const selector = optionName
      ? optionSelector.locator(`//*[text()="${optionName}"]`)
      : optionSelector;
    await selector.waitFor({ state: "visible" });
    await selector.click();
    this.consoleLog(`Grid: Select ${optionName} from Search Options`);
  }

  async clickToggleSwitch(page, toggleName) {
    const toggle = page
      .locator(`//*[text()="${toggleName}" and contains(@class,"label-switch")]`)
      .first();
    await toggle.scrollIntoViewIfNeeded();
    await toggle.waitFor({ state: "visible" });
    await toggle.hover();
    await toggle.click();
    this.consoleLog(`Toggler: Click on ${toggleName}`);
  }

  async hoverFilterBasedOnLabel(page, label, actionName?) {
    const groupEntity = page.locator(`.filter-options-wrapper`).locator(`//*[text()="${label}"]//ancestor::*[contains(@class,"entity-group")]`);
    await groupEntity.waitFor({ state: "visible" });
    await groupEntity.hover();
    let value = 0;
    let filterSelector;
    if (actionName.toLowerCase() == "addicon") {
      filterSelector = await this.getIconLocator(groupEntity, "Add");
    } else if (!actionName) {
      // Manage Filters
      filterSelector = await groupEntity.locator(`//*[contains(@class,"trigger-modal")]//*[text()="${label}"]`);
    } else {
      filterSelector = await groupEntity.locator(
        this.actionElement.getActionElement(actionName)
      );
      value = 1;
    }
    await filterSelector.waitFor({ state: "visible" });
    await filterSelector.hover();
    this.consoleLog(
      `Filter: Hover on ${value == 1 ? await filterSelector.innerText() : actionName} with Label Name as ${label}`
    );
    return { filterSelector, value };
  }

  async clickTabsDropdown(page) {
    await page.locator(`[aria-label="Tabs dropdown"]`).waitFor({ state: "visible" });
    await page.locator(`[aria-label="Tabs dropdown"]`).click();
    this.consoleLog(`Click on Tabs dropdown`);
  }

  async clickNav(page, tabName) {
      await page.locator(`//*[contains(@class,"nav-item")]//*[text()="${tabName}"]`).waitFor({ state: "visible" });
      await page.locator(`//*[contains(@class,"nav-item")]//*[text()="${tabName}"]`).click();
      this.consoleLog(`Nav: Click on ${tabName}`);
  }

  async clickTab(page, tabName) {
    await page.locator(`//*[contains(@class,"tab-item")]//*[text()="${tabName}"]`).waitFor({ state: "visible" });
    await page.locator(`//*[contains(@class,"tab-item")]//*[text()="${tabName}"]`).click();
    this.consoleLog(`Tab: Click on ${tabName}`);
  }

  async clickGlobalSearch(page, searchText) {
    await page.locator(`.global-search-placeholder, .global-search-combo  .search-combo-textfield`).waitFor({ state: "visible" });
    await page.locator(`.global-search-placeholder, .global-search-combo  .search-combo-textfield`).click();
    await page.locator(`.global-search-placeholder, .global-search-combo  .search-combo-textfield`).fill(searchText);
    this.consoleLog(`Global Search: Enter '${searchText}' in Global Search`);
  }

  async clickDropdownToggleContent(page, placeholder) {
    await page.locator(`//*[contains(@class,"dropdown-toggle-content") and text()="${placeholder}"]`).waitFor({ state: "visible" });
    await page.locator(`//*[contains(@class,"dropdown-toggle-content") and text()="${placeholder}"]`).click();
    this.consoleLog(`Dropdown Toggle Content: Click on Dropdown Toggle Content`);
  }

  async getDropdownOptionLocator(page, optionName?, count = 1){
    const optionSelector = await page.locator(`.option`);
    const option = optionName ? await optionSelector.locator(`//*[text()="${optionName}"]`) : await optionSelector;
    return await option.nth(count - 1);
  }

  async selectDropdownOption(page, optionName?, count = 1){
    const option = await this.getDropdownOptionLocator(page, optionName, count);
    await option.waitFor({ state: "visible" });
    await option.click();
    this.consoleLog(`Dropdown Option: Select ${optionName? optionName: `Random ${count} Option`}`)
  }

  async clickExactText(page, text) {
    await page.getByText(text, { exact: true });
  }

  async clickNonExactText(page, text) {
    await page.getByText(text, { exact: false });
  }
}

export default CommonPage;
