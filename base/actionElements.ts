// Dont import this file in other files except common-actions.ts file
// Dont make any changes into the existing methods

export class ActionElement {
    get textLink() { return 'a.common-link'; }
    get querySuggestion() { return '.query-suggestion'; }
    get editIcon() { return '.ki-edit'; }
    get noBulkCheckboxInGrid() { return ':not(.bulk-select-container) > .checkbox-container'; }

    getActionElement(actionName: string) {
        const actions: { [key: string]: string } = {
            'textlink': this.textLink,
            'editicon': this.editIcon,
            'nobulkcheckboxingrid': this.noBulkCheckboxInGrid,
            'querysuggestion': this.querySuggestion
        };

        const action = actions[actionName.toLowerCase()];
        return action || `//*[text()="${actionName}"]`;
    }

}