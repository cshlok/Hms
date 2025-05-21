# Research: Service Layer Abstraction - TypeScript Documentation (Everyday Types)

Source URL: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any

## Key Takeaways:

*   **Primitives:** `string`, `number`, `boolean` are fundamental types.
*   **Arrays:** Use `type[]` or `Array<type>`.
*   **`any` type:** Disables type checking. Useful in specific scenarios but generally discouraged. The `noImplicitAny` compiler flag can help avoid accidental `any` types.
*   **Type Annotations:** Can be added to variables, function parameters, and function return values. TypeScript often infers types, reducing the need for explicit annotations.
*   **Functions:** TypeScript allows specifying types for inputs and outputs. `Promise<type>` is used for functions returning promises.
*   **Contextual Typing:** Parameters of anonymous functions can often have their types inferred by TypeScript based on the context.

## Relevance to HMS Project (ARCH-2 - Service Layer):

While this page doesn't directly discuss service layer *architecture*, it covers fundamental TypeScript concepts that are essential for writing any TypeScript code, including service layers.

*   **Strong Typing:** Defining clear types for service method parameters and return values (e.g., `registerPatient(patientData: PatientInput): Promise<PatientOutput>`) is crucial for a robust service layer. This documentation provides the building blocks for those types.
*   **Avoiding `any`:** For a well-defined service layer, using `any` should be minimized to leverage TypeScript's type safety benefits. Understanding `noImplicitAny` is important.
*   **Function Signatures:** Correctly annotating function parameters and return types, especially for asynchronous operations returning Promises, is key to creating understandable and maintainable service methods.

This foundational knowledge will be applied when defining the interfaces and implementations for `PatientService`, `AuthService`, etc.
