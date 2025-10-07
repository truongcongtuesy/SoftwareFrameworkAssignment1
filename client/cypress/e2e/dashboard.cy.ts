function loginAsSuper() {
  cy.visit('/login');
  cy.get('input#username').type('super');
  cy.get('input#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Dashboard basics', () => {
  beforeEach(() => {
    loginAsSuper();
  });

  it('shows groups sections and admin access', () => {
    cy.contains('My Groups');
    cy.contains('Administration');
    cy.contains('Admin Panel');
  });
});


