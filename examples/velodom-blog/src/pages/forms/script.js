/**
 * ----------------------------------------
 * Module: Native Multi-step Form Lesson
 * ----------------------------------------
 *
 * Keeps a small draft and optional async name check in page state. This is a
 * local lesson, not a backend save, schema engine or global Core form store.
 * ----------------------------------------
 */

import { createLatestValidation } from "#app/domain/forms/latest-validation.js";

export const state = {
  step: 1,
  name: "",
  nameError: "",
  checkingName: false,
  touched: { name: false, contacts: [] },
  contacts: [{ id: "contact-1", email: "" }]
};

export function init({ state, ctx }) {
  let nextContactId = 2;
  let validatedName = "";
  let checkVersion = 0;
  const validation = createLatestValidation(checkDemoName, ctx.signal);
  ctx.onCleanup(validation.cancel);

  state.checkName = async value => {
    const version = ++checkVersion;
    state.touched = { ...state.touched, name: true };
    state.name = String(value ?? state.name).trimStart();
    validatedName = "";
    state.nameError = "";
    if (!state.name.trim()) {
      validation.cancel();
      state.checkingName = false;
      return false;
    }
    state.checkingName = true;
    try {
      const result = await validation.validate(state.name.trim());
      if (!result.current || ctx.signal.aborted) return false;
      state.nameError = result.value;
      validatedName = result.value ? "" : state.name.trim();
      return !result.value;
    } catch {
      if (ctx.signal.aborted) return false;
      state.nameError = "The demo check could not finish. Try again.";
      return false;
    } finally {
      if (!ctx.signal.aborted && version === checkVersion) state.checkingName = false;
    }
  };
  state.nextStep = async event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    if (validatedName !== state.name.trim() && !(await state.checkName(state.name))) return;
    if (!ctx.signal.aborted && !state.nameError) state.step = 2;
  };
  state.addContact = () => {
    state.contacts = [...state.contacts, { id: `contact-${nextContactId++}`, email: "" }];
  };
  state.updateContact = (id, email) => {
    state.contacts = state.contacts.map(contact => (
      contact.id === id ? { ...contact, email } : contact
    ));
    state.touched = {
      ...state.touched,
      contacts: [...new Set([...state.touched.contacts, id])]
    };
  };
  state.removeContact = id => {
    if (state.contacts.length > 1) {
      state.contacts = state.contacts.filter(contact => contact.id !== id);
      state.touched = {
        ...state.touched,
        contacts: state.touched.contacts.filter(contactId => contactId !== id)
      };
    }
  };
  state.previousStep = () => { state.step = 1; };
  state.review = event => {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) state.step = 3;
  };
  state.startAgain = () => {
    checkVersion++;
    validation.cancel();
    validatedName = "";
    state.step = 1;
    state.name = "";
    state.nameError = "";
    state.checkingName = false;
    state.touched = { name: false, contacts: [] };
    state.contacts = [{ id: `contact-${nextContactId++}`, email: "" }];
  };
}

// The asynchronous check is deliberately local; a real server must validate
// availability and ownership again when accepting a submission.
function checkDemoName(name, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve(["admin", "taken"].includes(name.toLowerCase())
        ? "This demo name is reserved. Try another."
        : "");
    }, 100);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Validation cancelled", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
