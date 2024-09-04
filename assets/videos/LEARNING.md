# 🧠 Learning and Technical Decisions

This document outlines the technical decisions made during the development of **Santorini Online**. As this project is a learning journey, several decisions were made deliberately to gain a deeper understanding of core technologies and their challenges.

---

## 1. Authentication over WebSockets

I chose to use **JWT (JSON Web Tokens)** for authentication over WebSockets. This decision was driven by a [known vulnerability](https://cve.mitre.org) when upgrading WebSocket connections with cookie-based authentication. JWT provides stateless, token-based authentication, allowing for secure communication without the need for session cookies, which can be more vulnerable during the WebSocket upgrade process.

---

## 2. Avoiding ORM for Database Migrations

While I have prior knowledge of databases, I decided **not to use an ORM** because I wanted to work closely with the database. As the data model for this project could get very complex, I wanted to be hands-on in making decisions and experience the challenges of database schema design and migration management. By writing my own SQL migrations and queries, I get to control the structure and implementation details of the database rather than relying on the abstraction provided by an ORM.

Although ORMs simplify common tasks like migrations and querying, avoiding them here allows me to deepen my understanding of database operations and face the challenge of maintaining a complex schema without the assistance of an ORM.

---

## 3. Building with Vanilla HTML and CSS

For the frontend, I chose to use **vanilla HTML and CSS** instead of a framework. This decision allows me to understand the challenges and nuances of developing user interfaces from scratch. I want to build up a fundamental understanding before introducing a frontend framework, which will help me better appreciate how frameworks like React, Vue, or Angular work under the hood.

---

## 4. Functional Programming and Avoiding Dependency Injection

I’ve opted to use a **functional programming approach** and avoid **Dependency Injection (DI)** because I’m not using classes in this project. I wanted to see how direct imports between files in **TypeScript** behave, even when multiple files import the same module.

The main challenge I've encountered so far has been **circular dependencies**, where two or more modules depend on each other. TypeScript didn’t provide much help in identifying or solving this issue, leading to runtime errors.

### Example: Normal Import Between Two Files

Here’s an example of how modules are imported without DI in a functional programming setup.

#### **fileA.ts**

```typescript
import { functionB } from "./fileB";

export function functionA() {
  console.log("Function A");
  functionB(); // Using functionB from fileB
}
```

```typescript
import { functionA } from "./fileA";

export function functionB() {
  console.log("Function B");
  functionA(); // Using functionA from fileA (creates circular dependency)
}
```

### Example: Using Dependency Injection

In contrast, Dependency Injection (DI) avoids direct imports by passing dependencies explicitly as arguments, which allows for greater flexibility and avoids circular references.

```typescript
export function functionA(dependencyB: () => void) {
  console.log("Function A");
  dependencyB(); // Using dependencyB passed as an argument
}
```

```typescript
import { functionA } from "./fileA";

export function functionB() {
  console.log("Function B");
  functionA(() => functionB()); // Passing functionB as a dependency to functionA
}
```

Here, functionA does not directly import functionB. Instead, functionB is passed as an argument, avoiding circular dependencies and improving the modularity of the code.
