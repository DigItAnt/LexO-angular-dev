import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { KeycloakAuthGuard, KeycloakService } from 'keycloak-angular';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard extends KeycloakAuthGuard {
  constructor(
    protected readonly router: Router,
    protected readonly keycloak: KeycloakService
  ) {
    super(router, keycloak);
  }

  // Questa funzione controlla se l'accesso a una determinata route è consentito per l'utente corrente.
  async isAccessAllowed(
    route: ActivatedRouteSnapshot, // Rappresenta lo stato corrente dell'attivazione di una route Angular.
    state: RouterStateSnapshot // Rappresenta lo stato corrente del router Angular.
  ): Promise<boolean | UrlTree> {
    // La funzione restituisce una promessa che può essere risolta con un booleano o con un UrlTree.

    // Se l'utente non è autenticato, lo reindirizza alla pagina di login.
    if (!this.authenticated) {
      await this.keycloak.login({
        redirectUri:
          window.location.origin +
          '/epilexo_itant/' +
          state.url /* aggiungere '/epilexo/' in produzione */,
      });
    }

    // Ottiene i ruoli richiesti per accedere alla route.
    const requiredRoles = route.data.roles;

    // Se non sono specificati ruoli richiesti o se non è specificato alcun ruolo, l'accesso è consentito.
    if (!(requiredRoles instanceof Array) || requiredRoles.length === 0) {
      return true;
    } else {
      // Se l'utente non ha ruoli o non sono stati specificati ruoli, l'accesso è negato.
      if (!this.roles || this.roles.length === 0) {
        return false;
      }
    }

    // Se l'utente non possiede tutti i ruoli richiesti, lo reindirizza alla homepage e nega l'accesso.
    if (!requiredRoles.every((role) => this.roles.includes(role))) {
      this.router.navigate(['/']);
    }

    // Restituisce true se l'utente possiede tutti i ruoli richiesti, altrimenti restituisce false.
    return requiredRoles.every((role) => this.roles.includes(role));
  }
}
