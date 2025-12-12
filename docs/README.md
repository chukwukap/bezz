# Documentation Index

## Quick Navigation

This folder contains comprehensive technical documentation for the Crypto Prediction Market on Stacks L2. Read documents in this order:

1. **[00_architecture_overview.md](00_architecture_overview.md)** - Start here for system design
2. **[01_implementation_plan.md](01_implementation_plan.md)** - Development roadmap and phases
3. **[02_smart_contract_specification.md](02_smart_contract_specification.md)** - Contract interfaces and logic
4. **[03_backend_api_specification.md](03_backend_api_specification.md)** - REST and WebSocket APIs
5. **[04_clarity_best_practices.md](04_clarity_best_practices.md)** - Coding standards and patterns
6. **[05_pyth_oracle_integration.md](05_pyth_oracle_integration.md)** - Oracle setup guide
7. **[06_deployment_guide.md](06_deployment_guide.md)** - Testnet and mainnet deployment

## Document Summaries

### 00_architecture_overview.md

High-level system architecture with component diagrams, data flow examples, technology stack decisions, and deployment architecture. Essential for understanding how all pieces fit together.

### 01_implementation_plan.md

Detailed 7-phase development plan breaking down the entire project into concrete tasks with timelines (14-19 weeks total). Includes smart contract, backend, frontend, testing, and deployment phases.

### 02_smart_contract_specification.md

Complete technical specification of the Clarity smart contract including:

- Modular architecture (5 core modules)
- Data structures and state variables
- Function specifications with parameters and returns
- Payout formulas and calculations
- Error codes and event emissions
- Security considerations

### 03_backend_api_specification.md

RESTful API and WebSocket specification covering:

- Market endpoints (CRUD operations)
- Betting endpoints
- User profile and statistics
- Oracle price feeds
- Admin dashboard APIs
- Database schema (Prisma)

### 04_clarity_best_practices.md

Comprehensive guide to writing secure, efficient Clarity code:

- Core principles (decidability, no reentrancy)
- Naming conventions
- Function design patterns
- Access control patterns
- Testing strategies
- Common pitfalls to avoid

### 05_pyth_oracle_integration.md

Step-by-step guide for integrating Pyth Network price feeds:

- Understanding feed IDs
- Off-chain integration (fetching VAAs)
- On-chain integration (reading prices)
- Backend scheduler for automatic resolution
- Fallback mechanisms and security

### 06_deployment_guide.md

Complete deployment instructions:

- Local development setup with Clarinet
- Testnet deployment workflow
- Mainnet deployment checklist
- Backend and frontend deployment
- CI/CD pipeline configuration
- Monitoring and rollback procedures

---

## Quick Reference

| Need to...                | See Document                                                     |
| ------------------------- | ---------------------------------------------------------------- |
| Understand the system     | 00_architecture_overview.md                                      |
| Plan development          | 01_implementation_plan.md                                        |
| Implement smart contracts | 02_smart_contract_specification.md, 04_clarity_best_practices.md |
| Build the backend         | 03_backend_api_specification.md                                  |
| Integrate oracles         | 05_pyth_oracle_integration.md                                    |
| Deploy to production      | 06_deployment_guide.md                                           |

---

**Total Pages**: ~110 pages of technical documentation  
**Last Updated**: December 12, 2025
