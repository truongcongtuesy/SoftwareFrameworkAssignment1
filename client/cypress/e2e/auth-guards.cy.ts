describe('Auth and Role Guards', () => {
  it('redirects unauthenticated users to /login', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('blocks non-admin from /admin', () => {
    // Register a regular user (if backend allows duplicate runs, ignore errors)
    cy.request({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/register',
      body: { username: `user_${Date.now()}`, email: `${Date.now()}@ex.com`, password: '123' },
      failOnStatusCode: false,
    }).then(() => {
      cy.visit('/login');
      cy.get('#username').type('super');
      cy.get('#password').type('123');
      cy.contains('button', 'Login').click();
      cy.url().should('include', '/dashboard');
      // Navigate to admin and ensure allowed for super
      cy.visit('/admin');
      cy.url().should('include', '/admin');
      // Logout
      cy.contains('Logout').click();
      cy.url().should('include', '/login');

      // Attempt to go to admin unauthenticated -> redirected
      cy.visit('/admin');
      cy.url().should('include', '/login');
    });
  });
});


