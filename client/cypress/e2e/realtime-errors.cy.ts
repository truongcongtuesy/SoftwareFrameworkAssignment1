function loginAsSuper() {
  cy.visit('/login');
  cy.get('#username').type('super');
  cy.get('#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Realtime and error cases', () => {
  beforeEach(() => loginAsSuper());

  it('loads message history when opening a channel', () => {
    cy.visit('/dashboard');
    cy.get('.group-card', { timeout: 15000 }).first().click({ force: true });
    cy.get('.channel-card', { timeout: 15000 }).first().click({ force: true });
    cy.get('.chat-messages .message').its('length');
  });

  it('prevents sending empty message', () => {
    // Ensure we are inside a chat page; if not, navigate
    cy.location('pathname').then((path) => {
      if (!/\/chat\//.test(path)) {
        cy.visit('/dashboard');
        cy.get('.group-card', { timeout: 15000 }).first().click({ force: true });
        cy.get('.channel-card', { timeout: 15000 }).first().click({ force: true });
      }
    });
    cy.url({ timeout: 15000 }).should('match', /\/chat\//);
    cy.get('.chat-input input.form-control', { timeout: 15000 }).clear();
    cy.contains('button', 'Send').should('be.disabled');
  });
});


