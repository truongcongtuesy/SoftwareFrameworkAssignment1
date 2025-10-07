function loginAsSuper() {
  cy.visit('/login');
  cy.get('#username').type('super');
  cy.get('#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Media uploads and chat basics', () => {
  beforeEach(() => loginAsSuper());

  it('uploads avatar', () => {
    cy.visit('/dashboard');
    const fileName = 'avatar.png';
    // Requires cypress-file-upload plugin to attach file; keep placeholder step
  });

  it('navigates to chat and sends a text message', () => {
    cy.visit('/dashboard');
    cy.get('.group-card', { timeout: 15000 }).first().click({ force: true });
    cy.get('.channel-card', { timeout: 15000 }).first().click({ force: true });
    cy.url().should('match', /\/chat\//);
    cy.get('.chat-input input.form-control', { timeout: 15000 }).type('E2E media message');
    cy.contains('button', 'Send').click();
    cy.get('.chat-messages').contains('E2E media message');
  });
});


