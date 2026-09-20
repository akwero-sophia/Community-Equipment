# Community Equipment & Resource Borrowing System

CSE 499 Senior Project — a small web application that helps communities and organizations list shared equipment, request items, approve loans, and track returns.

This is a small platform where members of a community, organization, school, or church can list equipment they own and allow other members to request to borrow it. Organizations often have useful equipment that is difficult to locate or track. This system would provide a centralized inventory and borrowing system.

## Team

| Member | Role

1. Joseph Anucha | Developer/Project Lead
2. Sophia Akwero | Developer
3. Emmanuel Owilli | Developer

## Project Links

- **GitHub Repository:** [Repository URL]
- **Trello / Project Board:** [Board URL]
- **Live Application:** [Deployed URL when available]
- **Project Proposal:** [Proposal link when available]

## Purpose

Organizations, churches, schools, clubs, and communities often own equipment that is shared among members, but they may not have a simple way to know what is available, who has borrowed an item, or when an item is expected back. This project provides a centralized system for listing equipment and managing the borrowing workflow.

## MVP Scope

The three-sprint MVP focuses on four complete workflows:

1. **Accounts** — register, log in, and log out.
2. **Equipment** — create, view, search/filter, and edit equipment listings.
3. **Borrowing** — submit a request with dates and purpose.
4. **Approval & Return** — an owner/admin approves or rejects a request; an approved loan can be marked returned and the equipment becomes available again.

### Core Requirements

- Member and admin roles
- Equipment categories and availability status
- Equipment search/filter
- Borrow requests
- Owner/admin approval and rejection
- Loan/return tracking
- Member request dashboard
- Admin dashboard with basic counts

### Post-MVP Enhancements

Only to be added after all core requirements are working:

- Email notifications
- QR codes for equipment
- Overdue reminders
- Equipment condition/history
- Reports and export

## Technology

- Node.JS
- Express
- MongoDB
- HTML/CSS/JavaScript
- GitHub for source control

## Running the Project

## --

--

### Demo Accounts

- Admin: `admin@example.com` / `Admin123!`
- Member: `member@example.com` / `Member123!`

Change or remove these demo credentials before any public deployment.

## Three-Sprint Plan

### Sprint 1 — Foundation & Equipment

**Goal:** A working application with authentication and equipment management.

- Create Node.js MVC project
- Configure and install Express
- Create database models and connect MongoDB
- Implement registration/login/logout
- Implement member/admin roles
- Create equipment CRUD
- Add search/filter
- Seed demo data
- Push working code to GitHub

**Sprint 1 Definition of Done:** A user can register/login, browse equipment, search equipment, and add/edit an equipment listing.

### Sprint 2 — Borrowing Workflow

**Goal:** Complete the main borrowing process.

- Create borrow request form
- Validate requested dates
- Show user request dashboard
- Show owner/admin pending requests
- Approve/reject requests
- Change equipment to Borrowed when approved
- Mark approved loans as Returned
- Change equipment back to Available
- Add authorization checks
- Test the complete request workflow

**Sprint 2 Definition of Done:** A member can request available equipment, an owner/admin can approve or reject it, and an approved loan can be returned.

### Sprint 3 — Quality, UX & Final Demonstration

**Goal:** Make the MVP stable, understandable, and presentation-ready.

- Fix functional bugs
- Improve responsive UI
- Add validation/error messages
- Test all core requirements
- Review authorization/security paths
- Clean up code and comments
- Update README and project documentation
- Deploy if required
- Prepare final demonstration video
- Verify every team member has meaningful GitHub contributions

**Sprint 3 Definition of Done:** All core requirements work from a clean start, the application is presentable, documentation is complete, and the team can demonstrate the full workflow.

## Main Demonstration Scenario

The final demonstration should show this sequence:

**Register/Login → Browse Equipment → View Details → Submit Borrow Request → Owner/Admin Approves → Equipment Becomes Borrowed → Borrower Returns Equipment → Equipment Becomes Available Again.**

## Scope Rule

The team should not add major features until the four MVP workflows are complete. Enhancements are optional and should never put the core requirements at risk.

## License

For CSE 499 academic project use. Add the team's preferred license if the project will be published publicly.
