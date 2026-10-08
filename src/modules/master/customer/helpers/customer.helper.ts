import type { CreateCustomerInput, UpdateCustomerInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Customer module.
 */
export function validateCreateCustomerInput(input: CreateCustomerInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  if (!input.contactPerson || input.contactPerson.trim() === "") {
    return "contactPerson is required";
  }
  if (!input.contactNumber || input.contactNumber.trim() === "") {
    return "contactNumber is required";
  }
  if (!input.telephoneNumber || input.telephoneNumber.trim() === "") {
    return "telephoneNumber is required";
  }
  if (!input.faxNumber || input.faxNumber.trim() === "") {
    return "faxNumber is required";
  }
  if (!input.emailAddress || input.emailAddress.trim() === "") {
    return "emailAddress is required";
  }
  if (!input.address || input.address.trim() === "") {
    return "address is required";
  }
  if (!input.country || input.country.trim() === "") {
    return "country is required";
  }
  if (!input.taxId || input.taxId.trim() === "") {
    return "taxId is required";
  }
  if (!input.paymentTerms || input.paymentTerms.trim() === "") {
    return "paymentTerms is required";
  }
  if (!input.shippingAddress || input.shippingAddress.trim() === "") {
    return "shippingAddress is required";
  }
  if (!input.shippingContactPerson || input.shippingContactPerson.trim() === "") {
    return "shippingContactPerson is required";
  }
  if (!input.shippingContactNumber || input.shippingContactNumber.trim() === "") {
    return "shippingContactNumber is required";
  }
  if (!input.shippingEmailAddress || input.shippingEmailAddress.trim() === "") {
    return "shippingEmailAddress is required";
  }
  if (!input.currency || input.currency.trim() === "") {
    return "currency is required";
  }
  return null;
}

export function validateUpdateCustomerInput(_input: UpdateCustomerInput): string | null {
  return null;
}
