import { KeycloakService } from 'keycloak-angular';
import { environment } from '../../../environments/environment';

/**
 * Questa funzione restituisce un inizializzatore per KeycloakService.
 * Viene utilizzato per inizializzare KeycloakService prima che l'applicazione venga avviata.
 * @param keycloak Il servizio Keycloak da inizializzare.
 * @returns Una funzione che restituisce una Promise vuota.
 */
export function initializer(keycloak: KeycloakService): () => Promise<any> {
  return (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Inizializza il servizio Keycloak con la configurazione fornita.
        await keycloak.init({
          config: {
            url: environment.keycloak.issuer, // URL del server Keycloak
            realm: environment.keycloak.realm, // Realm di Keycloak
            clientId: environment.keycloak.clientId, // Client ID dell'applicazione
          },
          loadUserProfileAtStartUp: false, // Non caricare il profilo utente all'avvio
          enableBearerInterceptor: true, // Abilita l'intercettazione dei token Bearer
          bearerPrefix: 'Bearer', // Prefisso per il token Bearer
          initOptions: {
            onLoad: 'check-sso', // Controlla il single sign-on all'avvio
            checkLoginIframe: true, // Controlla l'iframe di login
          },
          bearerExcludedUrls: [
            // URL esclusi dall'intercettazione del token Bearer
            'api.zotero.org',
          ],
        });
        resolve(); // Risolve la Promise dopo l'inizializzazione riuscita
      } catch (error) {
        reject(error); // Rigetta la Promise in caso di errore durante l'inizializzazione
      }
    });
  };
}
