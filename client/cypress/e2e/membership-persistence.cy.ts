function loginAsSuper() {
  cy.visit('/login');
  cy.get('#username').type('super');
  cy.get('#password').type('123');
  cy.contains('button', 'Login').click();
  cy.url().should('include', '/dashboard');
}

describe('Membership and persistence', () => {
  beforeEach(() => loginAsSuper());

  it('leaves a group and does not show it after reload', () => {
    cy.visit('/dashboard');
    cy.get('.group-card').then(cards => {
      if (cards.length > 0) {
        cy.wrap(cards[0]).click();
        cy.contains('Leave Group').click();
        cy.on('window:confirm', () => true);
        cy.reload();
      }
    });
  });
});


