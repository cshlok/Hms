# Research: Service Layer Abstraction - Clean Architecture with TypeScript, Prisma, Next.js

Source URL: https://www.arnaudrenaud.com/articles/clean-architecture-typescript-prisma-next/

## Key Takeaways on Clean Architecture and Service Layer:

*   **Purpose of Clean Architecture:** To separate concerns, making code more readable, testable, and adjustable. Analogy: prefer lasagna (layers) over spaghetti.
*   **Layers (Suggested):**
    *   **Domain:** Domain-specific entities, attributes, relations, constants. No infrastructure reliance. Defines domain logic.
    *   **Application Services (Use Cases):** Implementation of functionalities. Relies on infrastructure *only through abstract interfaces* (Dependency Inversion).
    *   **Infrastructure:** Implementation of interfaces relied on by services. Uses external dependencies (ORM, SDKs).
    *   **User Interface:** UI code (HTTP routes, CLI commands). Glues user to the service.
*   **Dependency Inversion:** Crucial for Clean Architecture. Application logic should not be polluted by infrastructure or UI details. Services depend on interfaces, not concrete implementations.
*   **Implementation Flow (Inside-Out):** Domain -> Service -> Infrastructure -> UI.

## Practical Example (Reservation System):

*   **Domain (`Reservation.ts`):**
    *   Defines `Reservation` type (id, startDate, endDate).
    *   Defines `ReservationExceptions` enum.
    *   Includes pure domain logic like `validateReservation(startDate, endDate)` which throws domain-specific exceptions.
*   **Application Service (`MakeReservation.ts`):**
    *   Takes dependencies (e.g., `reservationRepository: ReservationRepositoryInterface`) via constructor or function parameters (Dependency Injection).
    *   Calls domain validation logic (`validateReservation`).
    *   Interacts with the repository interface (`findOverlappingReservations`, `saveReservation`) to perform data operations.
    *   Contains the core business logic for the use case.
    *   Example structure: `export const MakeReservation = (reservationRepository: ReservationRepositoryInterface) => async (startDate: Date, endDate: Date) => { ... }`
*   **Infrastructure (Repository Interface - `ReservationRepositoryInterface.ts`):**
    *   Defines the contract for data access operations (e.g., `findOverlappingReservations`, `saveReservation`).
    *   This interface is what the application service depends on.
*   **Infrastructure (Repository Implementation - e.g., `PrismaReservationRepository.ts` - not fully shown but implied):**
    *   Implements the `ReservationRepositoryInterface` using a specific ORM (Prisma in this example).
    *   Handles the actual database interaction.
*   **User Interface (Next.js API Route - e.g., `pages/api/reservations.ts`):**
    *   Handles HTTP requests.
    *   Instantiates the repository implementation.
    *   Instantiates the application service, injecting the repository.
    *   Calls the service method with data from the request.
    *   Handles HTTP responses (success or error).

## Relevance to HMS Project (ARCH-2 - Service Layer & ARCH-3 - DAL/Repository):

This article is highly relevant for implementing the service layer (`PatientService`, `AuthService`, `BloodbankService`) and the repository pattern (`PatientRepository`).

*   **Service Layer (`src/services/...`):**
    *   Services should encapsulate business logic for specific use cases (e.g., `PatientService.registerPatient`).
    *   Services will depend on repository interfaces (e.g., `IPatientRepository`) injected into them.
    *   Services should call domain validation logic if applicable (though domain entities are not explicitly detailed in the HMS prompt, this is a good practice to consider).
*   **Repository Pattern (`src/repositories/...`):**
    *   Define interfaces for repositories (e.g., `IPatientRepository`).
    *   Implement these interfaces using the chosen database adapter (e.g., `PostgresqlAdapter`). The `PatientRepository` will use the `PostgresqlAdapter` to interact with the database.
*   **Directory Structure:** The article's structure (`src/domain`, `src/services`, `src/infrastructure`, `src/interfaces` or `src/app` for UI) aligns well with the HMS prompt's requirements.
*   **Dependency Injection:** Clearly shows how services receive their dependencies (repositories), which is a core principle for testability and decoupling.

This article provides a strong conceptual and practical foundation for structuring the application services and their interaction with the data access layer.
