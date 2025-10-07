function loginAsSuper() {
  cy.visit('/login');
  cy.get('#username').type('super');
  cy.get('#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Admin flows: groups/channels/users', () => {
  beforeEach(() => loginAsSuper());

  it('creates a group and a channel', () => {
    cy.visit('/admin');
    cy.contains('Create New Group', { timeout: 15000 }).should('be.visible').click();
    const gname = `e2e-group-${Date.now()}`;
    cy.get('#groupName', { timeout: 10000 }).type(gname);
    cy.get('#groupDesc').type('E2E created group');
    cy.contains('button', 'Create Group').click();
    cy.contains('table tr td', gname, { timeout: 15000 }).should('be.visible');

    // Manage group to create channel
    cy.contains('tr', gname, { timeout: 15000 }).within(() => {
      cy.contains('Manage').click();
    });
    // Wait for managing header appears
    cy.contains('.admin-section', 'Managing:', { timeout: 15000 })
      .should('be.visible')
      .within(() => {
        // Click the Channels tab within the Managing section
        cy.contains('.tab-button', 'Channels').should('be.visible').click({ force: true });
        // Wait for channels tab header within this section
        cy.contains('h4', 'Group Channels', { timeout: 15000 }).should('be.visible');
        cy.contains('button', 'Create Channel', { timeout: 15000 }).should('be.visible').click({ force: true });
      });
    const cname = `general-${Date.now()}`;
    cy.get('#channelName', { timeout: 10000 }).type(cname);
    cy.get('#channelDesc').type('Main');
    cy.contains('button', 'Create Channel').click();
    cy.contains('.channel-item', cname, { timeout: 15000 }).should('be.visible');
  });
});


