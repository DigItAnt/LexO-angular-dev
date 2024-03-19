/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  OnChanges,
  SimpleChanges,
  ElementRef,
  Input,
  OnDestroy,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { KeycloakService } from 'keycloak-angular';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ConfirmedValidator } from './validator/password-match';

@Component({
  selector: 'app-profiles-table',
  templateUrl: './profiles-table.component.html',
  styleUrls: ['./profiles-table.component.scss'],
})
export class ProfilesTableComponent implements OnInit, OnChanges, OnDestroy {
  message = '';
  users = [];
  private idClient;
  private selected_idUser;
  private modalRef: NgbModalRef;
  private temporaryId: string;
  public isPopulated = false;
  public creationRequest = false;
  public itsMe = null;

  private initialValue: any;

  selectedRoles = [];
  filterSelectedRoles = [];
  roles: any[] = [];
  //rolesNames = ['ADMIN', 'USER', 'REVIEWER'];

  @ViewChild('user_list') user_list: ElementRef;
  @ViewChild('button_create') button_create: ElementRef;
  @Input() isNotTheSameId: boolean;

  userDetailForm = new FormGroup({
    id: new FormControl(null),
    username: new FormControl(null, Validators.required),
    email: new FormControl(null, Validators.required),
    password: new FormControl(null),
    repeat_password: new FormControl(null),
    roles: new FormArray([]),
    enabled: new FormControl(null, Validators.required),
  });
  destroy$: Subject<boolean> = new Subject();
  private search_subject: Subject<any> = new Subject();
  roles_array: FormArray;

  constructor(
    private httpClient: HttpClient,
    private auth: AuthService,
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private keycloakService: KeycloakService
  ) {}

  ngOnInit(): void {
    // Creazione del form per i dettagli dell'utente
    this.userDetailForm = this.formBuilder.group(
      {
        id: new FormControl(null), // Campo per l'ID dell'utente
        username: new FormControl(null, [
          Validators.required,
          Validators.minLength(3),
        ]), // Campo per lo username dell'utente con validazioni di lunghezza minima
        email: new FormControl(null, [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'),
        ]), // Campo per l'email dell'utente con validazione del formato
        password: new FormControl(null, [
          Validators.required,
          Validators.minLength(8),
        ]), // Campo per la password dell'utente con validazioni di lunghezza minima
        repeat_password: new FormControl(null, [Validators.required]), // Campo per la ripetizione della password con validazione richiesta
        roles: [], // Array per i ruoli dell'utente
        enabled: new FormControl(false, [Validators.required]), // Campo per lo stato abilitato dell'utente con validazione richiesta
      },
      { validator: ConfirmedValidator('password', 'repeat_password') }
    ); // Validatore per la conferma della password

    // Recupero delle informazioni sui clienti
    this.auth.getClientsInfo().subscribe(
      (data) => {
        if (data != undefined && Array.isArray(data)) {
          // Se i dati non sono indefiniti e sono un array
          data.forEach((element) => {
            if (element.clientId == 'princlient') {
              this.idClient = element.id; // Assegnazione dell'ID del cliente 'princlient'
            }
          });
        }
      },
      (error) => {
        console.log(error);
      } // Gestione degli errori
    );

    // Intervallo di controllo per l'ID del cliente
    var checkIdTimer = setInterval((val) => {
      try {
        if (this.idClient != undefined) {
          // Se l'ID del cliente non è indefinito
          this.auth.getAllClientsRoles(this.idClient).subscribe(
            (data) => {
              let array = [];
              data.forEach((element, i) => {
                if (element.name.toUpperCase() == element.name) {
                  array.push({ name: element.name, id: element.id }); // Aggiunta dei ruoli in maiuscolo all'array
                }
              });
              console.log(array);
              array.forEach((c, i) => {
                this.roles.push({ id: i, name: c.name, role_id: c.id }); // Aggiunta dei ruoli all'array 'roles'
              });

              this.getUsersByRole(array); // Recupero degli utenti per ruolo
            },
            (error) => {
              console.log(error);
            } // Gestione degli errori
          );

          clearInterval(checkIdTimer); // Pulizia dell'intervallo di controllo
        } else {
          clearInterval(checkIdTimer); // Pulizia dell'intervallo di controllo
        }
      } catch (e) {
        console.log(e); // Gestione degli errori
      }
    }, 500); // Intervallo di controllo ogni 500 millisecondi

    // Recupero degli utenti
    this.auth.searchUser().subscribe(
      (data) => {
        if (data != undefined) {
          Array.from(data).forEach((usr: any) => {
            if (usr.username != undefined) {
              if (usr.username != 'prinadmin') {
                this.users.push(usr); // Aggiunta degli utenti escludendo 'prinadmin'
              }
            }
          });
        }
      },
      (error) => {
        console.log(error); // Gestione degli errori
      }
    );

    // Sottoscrizione all'observable per la ricerca degli utenti
    this.search_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.searchUsers(data); // Esecuzione della ricerca degli utenti
      });
  }

  // Questo metodo viene chiamato ogni volta che ci sono cambiamenti nei dati di input del componente.
  // Stampa le modifiche per scopi di debug.
  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
  }

  // Questo metodo recupera gli utenti associati ai ruoli specificati.
  // Prende un array di ruoli come input.
  getUsersByRole(roles_array) {
    // Itera attraverso gli elementi dell'array dei ruoli.
    roles_array.forEach((element) => {
      // Chiama il metodo del servizio di autenticazione per ottenere gli utenti associati al ruolo corrente.
      this.auth.getUsersByRole(this.idClient, element.name).subscribe(
        (data: any[]) => {
          // Itera attraverso i dati restituiti.
          data.forEach((usr) => {
            // Filtra gli utenti per trovare corrispondenze.
            this.users.filter((obj) => {
              if (obj.id == usr.id) {
                // Imposta il flag del ruolo corrente su true per l'utente corrente.
                obj[element.name] = true;
                // Imposta il flag "haveRoles" su true per l'utente corrente.
                obj['haveRoles'] = true;
              }
            });
          });
        },
        (error) => {
          console.log(error);
        }
      );
    });
  }

  // Questo metodo effettua una ricerca degli utenti utilizzando i dati specificati.
  searchUsers(data?) {
    // Chiama il metodo del servizio di autenticazione per effettuare la ricerca degli utenti.
    this.auth.searchUser(data).subscribe(
      (data) => {
        console.log(data);
        // Aggiorna l'elenco degli utenti con i risultati della ricerca.
        this.users = data;

        let array = [];

        // Copia gli elementi dell'array dei ruoli in un nuovo array.
        this.roles.forEach((element) => {
          array.push(element);
        });
        // Ottiene gli utenti associati a ciascun ruolo.
        this.getUsersByRole(array);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  // Questo metodo scatena la ricerca degli utenti quando si verifica un evento.
  triggerSearch(event?) {
    if (event != undefined) {
      // Ottiene il valore dell'input dell'utente.
      let value = event.target.value;
      // Invia il valore per la ricerca.
      this.search_subject.next(value);
    }
  }

  // Questo metodo viene chiamato quando il componente viene distrutto.
  ngOnDestroy(): void {
    // Invia un segnale per indicare che il componente sta per essere distrutto.
    this.destroy$.next(true);
    // Completa l'observable per evitare memory leak.
    this.destroy$.complete();
  }

  // Questo metodo gestisce il dettaglio di un utente specificato.
  userDetail(id) {
    if (id != undefined) {
      // Imposta l'ID dell'utente selezionato.
      this.selected_idUser = id;

      // Rimuove la classe "active" dal bottone di creazione.
      this.button_create.nativeElement.classList.remove('active');

      // Ottiene le informazioni sull'utente tramite il servizio di autenticazione.
      this.auth.getUserInfo(id).subscribe(
        (responseUserInfo) => {
          // Ottiene i ruoli dell'utente dal servizio di autenticazione.
          this.auth.getUserRoles(this.selected_idUser, this.idClient).subscribe(
            (responseUserRoles) => {
              if (
                responseUserRoles != undefined &&
                Array.isArray(responseUserRoles)
              ) {
                // Filtra i ruoli per selezionare solo quelli in maiuscolo.
                let filter = responseUserRoles.filter(
                  (element) => element.name.toUpperCase() === element.name
                );

                // Funzione di utilità per estrarre il nome del ruolo.
                const extractRoleName = (obj) => {
                  return obj.name;
                };

                // Estrae informazioni pertinenti dall'oggetto di risposta.
                let id = responseUserInfo.id;
                let username = responseUserInfo.username;
                let roles = filter.map(extractRoleName);
                let enabled = responseUserInfo.enabled;
                let email = responseUserInfo.email;
                console.log('RUOLI', roles);
                // Popola il modulo con le informazioni dell'utente.
                this.populateForm(id, username, email, roles, enabled);
              }
            },
            (errorUserRoles) => {
              console.log(errorUserRoles);
            }
          );
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

  populateForm(id, username, email, roles, enabled) {
    // Creazione del form per i dettagli dell'utente
    this.userDetailForm = this.formBuilder.group(
      {
        id: new FormControl(id), // Campo per l'ID dell'utente
        username: new FormControl(username, [
          Validators.required,
          Validators.minLength(3),
        ]), // Campo per lo username, richiesto e lunghezza minima 3 caratteri
        email: new FormControl(email, [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'),
        ]), // Campo per l'email, richiesto, lunghezza minima 3 caratteri e validato tramite espressione regolare
        password: new FormControl(null), // Campo per la password (vuoto inizialmente)
        repeat_password: new FormControl(null), // Campo per la ripetizione della password (vuoto inizialmente)
        roles: [], // Array per i ruoli dell'utente
        enabled: new FormControl(enabled, [Validators.required]), // Campo per indicare se l'utente è abilitato, richiesto
      },
      { validator: ConfirmedValidator('password', 'repeat_password') }
    ); // Validatore per confermare che la password e la sua ripetizione corrispondano

    // Impostazione dei ruoli selezionati
    this.selectedRoles = roles;
    // Impostazione della richiesta di creazione a falso
    this.creationRequest = false;
    // Indicazione che il form è stato popolato
    this.isPopulated = true;

    // Impostazione dell'initialValue del form dopo un ritardo di 500 millisecondi
    setTimeout(() => {
      this.initialValue = this.userDetailForm.value;
    }, 500);

    // Verifica se l'utente corrente è l'utente loggato
    this.itsMe = this.auth.getLoggedUser().sub == this.selected_idUser;
  }

  // Funzione per segnare il form come "toccato"
  markAsTouched() {
    this.userDetailForm.markAsTouched();
  }

  // Funzione per aggiornare l'utente
  updateUser() {
    // Verifica se il form è valido e se sono stati effettuati cambiamenti
    if (
      this.userDetailForm.valid &&
      !(
        JSON.stringify(this.initialValue) ==
        JSON.stringify(this.userDetailForm.value)
      )
    ) {
      // Creazione di un oggetto con i parametri da inviare per l'aggiornamento
      let parameters = {
        enabled: this.userDetailForm.get('enabled').value, // Stato di abilitazione dell'utente
        email: this.userDetailForm.get('email').value, // Email dell'utente
        username: this.userDetailForm.get('username').value, // Username dell'utente
      };
      console.log(parameters);

      // Chiamata al servizio per aggiornare l'utente
      this.auth.updateUser(this.selected_idUser, parameters).subscribe(
        (data) => {
          console.log(data);

          // Verifica se ci sono cambiamenti nei ruoli dell'utente
          if (
            JSON.stringify(this.initialValue.roles) !=
            JSON.stringify(this.userDetailForm.get('roles').value)
          ) {
            // Ottenimento dei ruoli iniziali e dei ruoli aggiornati
            let initialRoles = this.initialValue.roles;
            let updatedRoles = this.userDetailForm.get('roles').value;

            // Identificazione delle differenze tra i ruoli
            let difference = updatedRoles.filter(
              (x) => !initialRoles.includes(x)
            );
            let removeDiff = initialRoles.filter(
              (x) => !updatedRoles.includes(x)
            );

            console.log(difference, removeDiff);

            // Aggiunta di nuovi ruoli all'utente
            if (difference.length != 0) {
              difference.forEach((element) => {
                let object = [];
                let obj = {};
                this.roles.forEach((roles) => {
                  if (element == roles.name) {
                    obj = {
                      id: roles.role_id,
                      name: roles.name,
                    };
                    object.push(obj);
                    console.log(object);
                    // Chiamata al servizio per assegnare ruoli all'utente
                    this.auth
                      .assignRolesToUser(
                        this.selected_idUser,
                        this.idClient,
                        object
                      )
                      .subscribe(
                        (data) => {
                          console.log(data);
                          // Aggiornamento della visualizzazione degli utenti con i nuovi ruoli
                          this.users.forEach((element) => {
                            if (element.id == this.selected_idUser) {
                              element[obj['name']] = true;
                              element['haveRoles'] = true;
                            }
                          });
                          // Aggiornamento dei dettagli dell'utente
                          this.userDetail(this.selected_idUser);
                        },
                        (error) => {
                          console.log(error);
                        }
                      );
                    object = [];
                  }
                });
              });
            }
            // Rimozione di ruoli dall'utente
            else if (removeDiff.length != 0) {
              removeDiff.forEach((element) => {
                let object = [];
                let obj = {};
                this.roles.forEach((roles) => {
                  if (element == roles.name) {
                    obj = {
                      id: roles.role_id,
                      name: roles.name,
                    };
                    object.push(obj);

                    console.log(object);
                    // Chiamata al servizio per rimuovere ruoli dall'utente
                    this.auth
                      .deleteRolesToUser(
                        this.selected_idUser,
                        this.idClient,
                        object
                      )
                      .subscribe(
                        (data) => {
                          console.log(data);
                          // Aggiornamento della visualizzazione degli utenti senza i ruoli rimossi
                          this.users.forEach((element) => {
                            if (element.id == this.selected_idUser) {
                              element[obj['name']] = false;
                              element['haveRoles'] = false;
                            }
                          });
                          // Aggiornamento dei dettagli dell'utente
                          this.userDetail(this.selected_idUser);
                        },
                        (error) => {
                          console.log(error);
                        }
                      );

                    object = [];
                  }
                });
              });
            }
          }
        },
        (error) => {
          console.log(error);
        }
      );
    } else {
      // Avviso che non sono stati effettuati aggiornamenti
      alert('Nessun aggiornamento. Le informazioni sono le stesse');
    }
  }

  // Questo metodo viene chiamato per registrare un nuovo utente
  registerUser() {
    console.log(this.userDetailForm); // Stampa il modulo dei dettagli dell'utente nella console
    if (this.userDetailForm.valid) {
      // Controlla se il modulo è valido
      let parameters = {
        // Parametri per la creazione dell'utente
        enabled: this.userDetailForm.get('enabled').value, // Ottiene lo stato di attivazione dall'input dell'utente
        email: this.userDetailForm.get('email').value, // Ottiene l'email dall'input dell'utente
        username: this.userDetailForm.get('username').value, // Ottiene lo username dall'input dell'utente
        credentials: [
          // Credenziali dell'utente
          {
            type: 'password', // Tipo di credenziale: password
            value: this.userDetailForm.get('password').value, // Ottiene la password dall'input dell'utente
            temporary: false, // Imposta la password come non temporanea
          },
        ],
      };

      console.log(parameters); // Stampa i parametri nella console

      // Chiamata al metodo per creare un nuovo utente
      this.auth.createUser(parameters).subscribe(
        (data) => {
          // Callback di successo
          console.log(data); // Stampa i dati ricevuti dalla creazione dell'utente nella console

          // Chiamata al metodo per ottenere l'utente appena creato tramite lo username
          this.auth
            .getUserByUsername(this.userDetailForm.get('username').value)
            .subscribe(
              (data) => {
                // Callback di successo
                console.log(data); // Stampa i dati ricevuti dalla richiesta nell'utente nella console
                if (data != undefined) {
                  // Controlla se i dati ricevuti non sono indefiniti

                  // Pulisce i link attivi
                  this.cleanActiveLinks();

                  // Itera attraverso i nuovi utenti
                  data.forEach((newUser) => {
                    if (this.selectedRoles.length > 0) {
                      // Controlla se ci sono ruoli selezionati

                      // Itera attraverso i ruoli selezionati
                      this.selectedRoles.forEach((element) => {
                        let object = []; // Inizializza un array vuoto
                        let obj = {}; // Inizializza un oggetto vuoto
                        this.roles.forEach((roles) => {
                          // Itera attraverso i ruoli
                          if (element == roles.name) {
                            // Controlla se il ruolo corrisponde al nome
                            obj = {
                              // Crea un nuovo oggetto con id e nome del ruolo
                              id: roles.role_id,
                              name: roles.name,
                            };

                            object.push(obj); // Aggiunge l'oggetto all'array
                          }
                        });

                        console.log(object); // Stampa l'oggetto nella console

                        // Assegna ruoli all'utente
                        this.auth
                          .assignRolesToUser(newUser.id, this.idClient, object)
                          .subscribe(
                            (data) => {
                              // Callback di successo
                              console.log(data); // Stampa i dati ricevuti dall'assegnazione dei ruoli nella console
                              // Itera attraverso gli utenti
                              this.users.forEach((element) => {
                                if (element.id == newUser.id) {
                                  // Controlla se l'id dell'utente corrisponde
                                  element[obj['name']] = true; // Imposta il ruolo come vero per l'utente
                                  element['haveRoles'] = true; // Imposta 'haveRoles' come vero per l'utente
                                }
                              });
                            },
                            (error) => {
                              console.log(error);
                            } // Callback di errore
                          );
                      });
                    }

                    // Aggiunge l'utente alla lista degli utenti
                    this.users.push(newUser);

                    // Visualizza i dettagli dell'utente
                    this.userDetail(newUser.id);

                    // Imposta un timeout per attivare il nuovo link utente
                    setTimeout(() => {
                      this.activeNewUserLink(
                        this.userDetailForm.get('username').value
                      );
                    }, 100);
                  });
                }
              },
              (error) => {
                // Callback di errore
                console.log(error); // Stampa l'errore nella console
              }
            );
        },
        (error) => {
          // Callback di errore
          console.log(error); // Stampa l'errore nella console
        }
      );
    }
  }

  // Resetta il modulo del form degli utenti
  resetForm() {
    this.userDetailForm.reset(); // Resetta il form
    this.userDetailForm.markAsUntouched(); // Marca il form come non toccato
    this.userDetailForm.markAsPristine(); // Marca il form come pulito
  }

  // Elimina un utente
  deleteUser() {
    console.log(this.selected_idUser); // Stampa l'id dell'utente selezionato nella console

    // Chiamata al metodo per eliminare l'utente
    this.auth.deleteUser(this.selected_idUser).subscribe(
      (data) => {
        // Callback di successo
        console.log(data); // Stampa i dati ricevuti dalla cancellazione dell'utente nella console
        // Filtra gli utenti per escludere quello eliminato
        let filtered = this.users.filter(
          (element) => element.id != this.selected_idUser
        );

        this.users = filtered; // Aggiorna la lista degli utenti

        // Pulisce i link attivi e resetta il form dell'utente
        this.cleanActiveLinks();
        this.userDetailForm.reset();
        this.isPopulated = false;
        this.creationRequest = false;

        this.modalRef.close(); // Chiude il modal
      },
      (error) => {
        console.log(error);
      } // Callback di errore
    );
  }

  // Funzione per creare un nuovo utente
  createNewUser() {
    // Pulisce i link attivi
    this.cleanActiveLinks();
    // Imposta l'id utente selezionato su null
    this.selected_idUser = null;

    // Funzione per generare un nuovo id utente
    const makeId = function makeid() {
      var result = '';
      var characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var charactersLength = characters.length;
      // Genera 9 caratteri casuali
      for (var i = 0; i < 9; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }

      result += '-';

      // Genera altri 5 caratteri casuali
      for (var j = 0; j < 5; j++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }

      result += '-';

      // Genera altri 5 caratteri casuali
      for (var l = 0; l < 5; l++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }

      result += '-';

      // Genera altri 13 caratteri casuali
      for (var m = 0; m < 13; m++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }

      return result;
    };

    // Assegna un nuovo id temporaneo all'utente
    this.temporaryId = makeId();

    // Crea un form per i dettagli dell'utente
    this.userDetailForm = this.formBuilder.group(
      {
        id: new FormControl(this.temporaryId),
        username: new FormControl(null, [
          Validators.required,
          Validators.minLength(3),
        ]),
        email: new FormControl(null, [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'),
        ]),
        password: new FormControl(null, [
          Validators.required,
          Validators.minLength(8),
        ]),
        repeat_password: new FormControl(null, [Validators.required]),
        roles: [],
        enabled: new FormControl(false, [Validators.required]),
      },
      { validator: ConfirmedValidator('password', 'repeat_password') }
    );

    // Imposta la richiesta di creazione su true
    this.creationRequest = true;
    // Imposta il flag di popolazione su true
    this.isPopulated = true;
    // Inizializza un array vuoto per i ruoli selezionati
    this.selectedRoles = [];
    // Imposta il flag 'itsMe' su false
    this.itsMe = false;
  }

  // Funzione per pulire i link attivi
  cleanActiveLinks() {
    var links = this.user_list.nativeElement.querySelectorAll('a');
    links.forEach((element) => {
      if (element.classList.contains('active')) {
        element.classList.remove('active');
      }
    });
  }

  // Funzione per attivare il link del nuovo utente
  activeNewUserLink(username) {
    var links = this.user_list.nativeElement.querySelectorAll('a');
    links.forEach((element) => {
      // Controlla se il testo del link corrisponde al nome utente e lo attiva
      if (element.innerText == username) {
        element.classList.add('active');
      }
    });
  }

  // Funzione per trovare i controlli non validi nel form
  findInvalidControls() {
    const invalid = [];
    const controls = this.userDetailForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }

    return invalid;
  }

  // Apre il modal con il contenuto specificato
  open(content) {
    this.modalRef = this.modalService.open(content);
  }

  /* addTagFn(name) {
    return { name: name, tag: true };
  } */
}
