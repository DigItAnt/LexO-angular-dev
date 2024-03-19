import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile, KeycloakTokenParsed } from 'keycloak-js';
import { from, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthService {
  private baseUrl = environment.keycloak.issuer;
  private realmId = environment.keycloak.realm;
  private clientId = environment.keycloak.clientId;

  constructor(
    private keycloakService: KeycloakService,
    private http: HttpClient
  ) {}

  /**
   * Questo metodo restituisce le informazioni dell'utente attualmente loggato.
   * Se non c'è nessun utente loggato o ci sono problemi con l'ottenimento delle informazioni,
   * verrà restituito 'undefined'.
   */
  public getLoggedUser(): KeycloakTokenParsed | undefined {
    try {
      const userDetails: KeycloakTokenParsed | undefined =
        this.keycloakService.getKeycloakInstance().idTokenParsed;
      return userDetails;
    } catch (e) {
      console.error('Eccezione', e);
      return undefined;
    }
  }

  /**
   * Questo metodo restituisce una Promise che si risolve in un valore booleano che indica
   * se l'utente è attualmente loggato o meno.
   */
  public isLoggedIn(): Promise<boolean> {
    return this.keycloakService.isLoggedIn();
  }

  /**
   * Questo metodo restituisce una Promise che si risolve nel profilo dell'utente attualmente loggato.
   */
  public loadUserProfile(): Promise<KeycloakProfile> {
    return this.keycloakService.loadUserProfile();
  }

  /**
   * Questo metodo avvia il processo di login attraverso il servizio Keycloak.
   */
  public login(): void {
    this.keycloakService.login();
  }

  /**
   * Questo metodo esegue il logout attraverso il servizio Keycloak.
   */
  public logout(): void {
    this.keycloakService.logout();
  }

  /**
   * Questo metodo reindirizza l'utente al suo profilo nel servizio Keycloak.
   */
  public redirectToProfile(): void {
    this.keycloakService.getKeycloakInstance().accountManagement();
  }

  /**
   * Questo metodo restituisce il nome utente dell'utente attualmente loggato.
   * Se non c'è nessun utente loggato, ricarica la pagina e restituisce null.
   */
  public getUsername(): any {
    if (this.getLoggedUser() != undefined) {
      return this.getLoggedUser()['preferred_username'];
    } else {
      window.location.reload();
      return null;
    }
  }

  /**
   * Questo metodo restituisce i ruoli correnti dell'utente.
   */
  public getCurrentUserRole(): string[] {
    return this.keycloakService.getKeycloakInstance().realmAccess.roles;
  }

  /**
   * Questo metodo cerca un utente con il termine specificato.
   */
  public searchUser(search?): any {
    let string = this.baseUrl + 'admin/realms/' + this.realmId + '/users';
    if (search != undefined) {
      string += '?search=' + search;
    }
    return this.http.get(string);
  }

  /**
   * Questo metodo restituisce le informazioni dell'utente con il nome utente specificato.
   */
  public getUserByUsername(username?): any {
    let string = this.baseUrl + 'admin/realms/' + this.realmId + '/users';
    if (username != undefined) {
      string += '?username=' + username;
    }
    return this.http.get(string);
  }

  /**
   * Questo metodo restituisce i ruoli dell'utente per un determinato client.
   */
  public getUserRoles(userId: string, clientId: string): any {
    let string =
      this.baseUrl +
      'admin/realms/' +
      this.realmId +
      '/users/' +
      userId +
      '/role-mappings/clients/' +
      clientId;
    return this.http.get(string);
  }

  /**
   * Questo metodo restituisce tutti i ruoli disponibili per un determinato client.
   */
  public getAllClientsRoles(id: string): any {
    let string =
      this.baseUrl +
      'admin/realms/' +
      this.realmId +
      '/clients/' +
      id +
      '/roles/';
    return this.http.get(string);
  }

  /**
   * Questo metodo restituisce le informazioni su tutti i client disponibili.
   */
  public getClientsInfo(): any {
    let string = this.baseUrl + 'admin/realms/' + this.realmId + '/clients/';
    return this.http.get(string);
  }

  /**
   * Questo metodo restituisce le informazioni di un utente specificato.
   */
  public getUserInfo(id): any {
    let string = this.baseUrl + 'admin/realms/' + this.realmId + '/users/' + id;
    return this.http.get(string);
  }

  /**
   * Questo metodo restituisce gli utenti con il ruolo specificato per un client specifico.
   */
  public getUsersByRole(id, role_name): any {
    let string =
      this.baseUrl +
      'admin/realms/' +
      this.realmId +
      '/clients/' +
      id +
      '/roles/' +
      role_name +
      '/users';
    return this.http.get(string);
  }

  /**
   * Questo metodo crea un nuovo utente con i parametri specificati.
   */
  public createUser(parameters) {
    let string = this.baseUrl + 'admin/realms/' + this.realmId + '/users/';
    return this.http.post(string, parameters);
  }

  /**
   * Questo metodo elimina un utente con l'ID specificato.
   */
  public deleteUser(idUser: string) {
    let string =
      this.baseUrl + 'admin/realms/' + this.realmId + '/users/' + idUser;
    return this.http.delete(string);
  }

  /**
   * Questo metodo aggiorna un utente con l'ID specificato con il corpo specificato.
   */
  public updateUser(idUser: string, body) {
    let string =
      this.baseUrl + 'admin/realms/' + this.realmId + '/users/' + idUser;
    return this.http.put(string, body);
  }

  /**
   * Questo metodo assegna ruoli a un utente specificato per un client specificato.
   */
  public assignRolesToUser(userId, clientId, parameters) {
    let string =
      this.baseUrl +
      'admin/realms/' +
      this.realmId +
      '/users/' +
      userId +
      '/role-mappings/clients/' +
      clientId;
    return this.http.post(string, parameters);
  }

  /**
   * Questo metodo elimina ruoli da un utente specificato per un client specificato.
   */
  public deleteRolesToUser(userId, clientId, parameters) {
    let options = {
      headers: new HttpHeaders().set('Content-Type', 'application/json'),
      body: parameters,
    };
    let string =
      this.baseUrl +
      'admin/realms/' +
      this.realmId +
      '/users/' +
      userId +
      '/role-mappings/clients/' +
      clientId;
    return this.http.delete(string, options);
  }
}
