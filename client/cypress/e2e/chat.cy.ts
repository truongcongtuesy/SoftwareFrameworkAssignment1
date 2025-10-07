function loginAsSuper() {
  cy.visit('/login');
  cy.get('input#username').type('super');
  cy.get('input#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Chat happy path', () => {
  before(() => {
    // Ensure logged in
    loginAsSuper();
  });

  it('navigates into a group and channel and sends a message', () => {
    // If there are no groups/channels, this test will just verify UI presence
    // Prefer selecting the first available group and channel
    cy.get('.groups-grid .group-card').first().click({ force: true });
    // channel list loads
    cy.get('.channels-grid .channel-card').first().click({ force: true });
    cy.url().should('match', /\/chat\//);

    // Type a message
    cy.get('.chat-input input.form-control').type('Hello from Cypress');
    cy.contains('button', 'Send').click();

    // Message should appear (optimistic via socket may require server running)
    cy.get('.chat-messages').contains('Hello from Cypress');
  });
});


