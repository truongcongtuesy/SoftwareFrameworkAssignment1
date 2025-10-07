describe('Login flow', () => {
  it('shows login page and logs in super admin', () => {
    cy.visit('/login');
    cy.contains('Login to Chat System');
    cy.get('input#username').type('super');
    cy.get('input#password').type('123');
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Chat System');
    cy.contains('Super Admin');
  });
});


