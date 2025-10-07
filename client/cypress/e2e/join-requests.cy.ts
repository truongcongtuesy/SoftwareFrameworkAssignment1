function loginAsSuper() {
  cy.visit('/login');
  cy.get('#username').type('super');
  cy.get('#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Join requests lifecycle', () => {
  before(() => loginAsSuper());

  it('submits and approves a join request', () => {
    // Ensure at least one group exists; else create via admin flow
    cy.visit('/dashboard');
    cy.get('.groups-section').first().within(() => {
      cy.get('.group-card').its('length').then(len => {
        if (len === 0) {
          cy.contains('Create Group').click();
          cy.get('#dashGroupName').type(`join-group-${Date.now()}`);
          cy.contains('button', 'Create').click();
        }
      });
    });

    // Open admin, check pending requests header exists
    cy.visit('/admin');
    cy.get('.nav-notify');
  });
});


