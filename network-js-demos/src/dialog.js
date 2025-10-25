/**
 * DialogForm - A reusable modal dialog component
 * Provides an easy way to create input forms, confirmations, and other modal UIs
 */
export class DialogForm {
  /**
   * Constructor for the DialogForm class
   * @param {Object} options - Configuration options for the dialog.
   *   @param {string} [options.modalContainerClassName='modal-overlay'] - CSS class for the modal overlay container.
   *   @param {string} [options.dialogClassName='modal-dialog'] - CSS class for the dialog box.
   *   @param {string} [options.titleClassName='modal-title'] - CSS class for the dialog title.
   *   @param {string} [options.contentClassName='modal-content'] - CSS class for the dialog content area.
   *   @param {string} [options.actionsClassName='modal-actions'] - CSS class for the actions (button) container.
   *   @param {string} [options.buttonClassName='modal-btn'] - CSS class for all dialog buttons.
   *   @param {string} [options.primaryButtonClassName='primary'] - CSS class for primary action buttons.
   *   @param {string} [options.secondaryButtonClassName='secondary'] - CSS class for secondary action buttons.
   *   @param {boolean} [options.closeOnOverlayClick=true] - Whether clicking the overlay closes the dialog.
   *   @param {boolean} [options.closeOnEscape=true] - Whether pressing Escape closes the dialog.
   *   @param {function} [options.onClose] - Callback function to run when the dialog is closed.
   */
  constructor(options = {}) {
    this.modalContainer = null;
    this.focusableElement = null;
    this.options = options;
  }

  /**
   * Create and display a modal dialog
   *
   * @param {string} title - Dialog title
   * @param {string|HTMLElement|HTMLElement[]} content - Dialog content
   * @param {Array} actions - Array of action objects {text, primary, onClick, closeOnClick}
   * @returns {HTMLElement} - The modal container element
   */
  createModal(title, content, actions) {
    // Remove any existing modal
    this.removeModal();

    // Create modal container
    this.modalContainer = document.createElement("div");
    this.modalContainer.className =
      this.options.modalContainerClassName || "modal-overlay";

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = this.options.dialogClassName || "modal-dialog";

    // Add title
    const titleEl = document.createElement("h3");
    titleEl.className = this.options.titleClassName || "modal-title";
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    // Add content
    const contentEl = document.createElement("div");
    contentEl.className = this.options.contentClassName || "modal-content";

    if (typeof content === "string") {
      contentEl.textContent = content;
    } else if (content instanceof HTMLElement) {
      contentEl.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach((el) => {
        if (el instanceof HTMLElement) {
          contentEl.appendChild(el);
        }
      });
    }

    dialog.appendChild(contentEl);

    // Add actions
    const actionsEl = document.createElement("div");
    actionsEl.className = this.options.actionsClassName || "modal-actions";

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.className =
        this.options.buttonClassName != null
          ? `${this.options.buttonClassName} ${
              action.primary ? "primary" : "secondary"
            }`
          : `modal-btn ${action.primary ? "primary" : "secondary"}`;
      button.textContent = action.text;
      button.addEventListener("click", () => {
        if (action.onClick) {
          action.onClick();
        }
        if (action.closeOnClick !== false) {
          this.removeModal();
        }
      });
      actionsEl.appendChild(button);
    });

    dialog.appendChild(actionsEl);
    this.modalContainer.appendChild(dialog);
    document.body.appendChild(this.modalContainer);

    // Find the first input field and focus it
    this.focusFirstInput();

    return this.modalContainer;
  }

  /**
   * Focus the first input, select, or textarea element in the dialog
   */
  focusFirstInput() {
    if (!this.modalContainer) return;

    // Look for the first focusable element
    this.focusableElement = this.modalContainer.querySelector(
      "input, select, textarea"
    );

    // If found, focus it and optionally select the text in inputs
    if (this.focusableElement) {
      setTimeout(() => {
        this.focusableElement.focus();
        if (
          this.focusableElement.tagName === "INPUT" &&
          this.focusableElement.type !== "checkbox" &&
          this.focusableElement.type !== "radio"
        ) {
          this.focusableElement.select();
        }
      }, 100); // Short delay to ensure the dialog is fully rendered
    }
  }

  /**
   * Remove the current modal dialog
   */
  removeModal() {
    if (this.modalContainer) {
      document.body.removeChild(this.modalContainer);
      this.modalContainer = null;
      this.focusableElement = null;
    }
  }

  /**
   * Create an input field with label
   *
   * @param {string} label - Input label text
   * @param {string} type - Input type (text, email, password, etc.)
   * @param {string} id - Input ID
   * @param {string} value - Default input value
   * @returns {Object} - Object containing container and input elements
   */
  createInput(label, type = "text", id, value = "") {
    const container = document.createElement("div");

    if (label) {
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      if (id) labelEl.setAttribute("for", id);
      container.appendChild(labelEl);
    }

    const input = document.createElement("input");
    input.type = type;
    input.className = this.options.inputClassName || "input-field";
    if (id) input.id = id;
    input.value = value;

    container.appendChild(input);
    return { container, input };
  }

  /**
   * Create a select dropdown with label
   *
   * @param {string} label - Select label text
   * @param {Array} options - Array of option objects {value, text}
   * @param {string} id - Select ID
   * @returns {Object} - Object containing container and select elements
   */
  createSelect(label, options, id) {
    const container = document.createElement("div");

    if (label) {
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      if (id) labelEl.setAttribute("for", id);
      container.appendChild(labelEl);
    }

    const select = document.createElement("select");
    select.className = this.options.selectClassName || "input-field";
    if (id) select.id = id;

    options.forEach((option) => {
      const optEl = document.createElement("option");
      optEl.value = option.value;
      optEl.textContent = option.text;
      select.appendChild(optEl);
    });

    container.appendChild(select);
    return { container, select };
  }
}
export default DialogForm;