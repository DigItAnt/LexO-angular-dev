/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
} from '@angular/core';
import { ModalComponent } from 'ng-modal-lib';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import {
  catchError,
  debounceTime,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { FormPanelComponent } from './form-panel/form-panel.component';

@Component({
  selector: 'app-attestation-panel',
  templateUrl: './attestation-panel.component.html',
  styleUrls: ['./attestation-panel.component.scss'],
})
export class AttestationPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() attestationData: any;
  @ViewChild('addBibliographyAttestation', { static: false })
  modal: ModalComponent;
  @ViewChild('table_body') tableBody: ElementRef;
  @ViewChild('accordion') accordion: ElementRef;
  @ViewChild('formPanel', { read: ViewContainerRef }) vc: ViewContainerRef;

  bibliography = [];
  typesData = [];
  private update_anno_subject: Subject<any> = new Subject();
  private update_biblio_anno_subject: Subject<any> = new Subject();
  private searchSubject: Subject<any> = new Subject();

  start = 0;
  sortField = 'title';
  direction = 'asc';
  memorySort = { field: '', direction: '' };
  queryTitle = '';
  queryMode = 'titleCreatorYear';
  selectedItem;
  selectedAnnotation;
  fileId;

  arrayPanelFormsData = {};
  arrayComponents = [];
  typeDesc = '';
  staticOtherDef = [];
  labelData = [];
  bind = this;

  destroy$: Subject<boolean> = new Subject();

  get_form_subscription: Subscription;
  get_id_text_subscription: Subscription;
  update_anno_subscription: Subscription;
  update_anno_biblio_subject_subscription: Subscription;
  biblio_bootstrap_subscription: Subscription;
  search_subject_subscription: Subscription;

  constructor(
    private toastr: ToastrService,
    private biblioService: BibliographyService,
    private expander: ExpanderService,
    private annotatorService: AnnotatorService,
    private lexicalService: LexicalEntriesService,
    private factory: ComponentFactoryResolver
  ) {}

  formData = [];
  ngOnInit(): void {
    // Sottoscrizione al servizio lexicalService per ottenere i tipi di form e assegnarli a `this.typesData`.
    // La sottoscrizione viene annullata quando `this.destroy$` emette un valore.
    this.lexicalService
      .getFormTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.typesData = data; // Assegnazione dei dati ricevuti a `this.typesData`.
        },
        (error) => {
          // Gestione degli errori qui, se necessario.
        }
      );

    // Sottoscrizione a `getIdText$` del servizio annotatorService per ottenere l'ID del file e registrarlo.
    // La sottoscrizione viene annullata quando `this.destroy$` emette un valore.
    this.annotatorService.getIdText$.pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        console.log(data); // Stampa il dato ricevuto per debug.
        this.fileId = data; // Assegnazione dell'ID del file a `this.fileId`.
      },
      (error) => {
        console.log(error); // Stampa l'errore per debug.
      }
    );

    // Sottoscrizione a `update_anno_subject` per aggiornare l'annotazione dopo un debounce di 3000ms.
    // Viene eseguito solo se `data` non è null. La sottoscrizione viene annullata quando `this.destroy$` emette un valore.
    this.update_anno_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data != null) {
          this.updateAnnotation(data); // Chiamata alla funzione di aggiornamento dell'annotazione.
        }
      });

    // Sottoscrizione simile a `update_anno_subject` ma per aggiornare le annotazioni bibliografiche.
    this.update_biblio_anno_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data != null) {
          this.updateBiblioAnnotation(data); // Chiamata alla funzione di aggiornamento dell'annotazione bibliografica.
        }
      });

    // Sottoscrizione al servizio `biblioService` per inizializzare i dati bibliografici con ordinamento.
    // Dopo la ricezione, nasconde il modal e rimuove il backdrop.
    this.biblioService
      .bootstrapData(this.start, this.sortField, this.direction)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.memorySort = {
            field: this.sortField,
            direction: this.direction,
          }; // Memorizza l'ordinamento corrente.
          this.bibliography = data; // Assegna i dati ricevuti a `this.bibliography`.
          this.bibliography.forEach((element) => {
            element['selected'] = false; // Inizializza la proprietà 'selected' per ogni elemento.
          });

          // Nasconde il modal di bibliografia e rimuove il backdrop.
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();
        },
        (error) => {
          console.log(error); // Stampa l'errore per debug.
        }
      );

    // Sottoscrizione a `searchSubject` per effettuare una ricerca bibliografica in base ai criteri ricevuti.
    this.searchSubject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.queryTitle = data.query; // Assegna il titolo della query.
        // Imposta `this.queryMode` in base al modo di query ricevuto.
        data.queryMode
          ? (this.queryMode = 'everything')
          : (this.queryMode = 'titleCreatorYear');
        this.searchBibliography(this.queryTitle, this.queryMode); // Esegue la ricerca bibliografica.
      });

    // Sottoscrizione a `changeFormLabelReq$` del servizio lexicalService per cambiare l'etichetta di un form.
    // Effettua l'aggiornamento e mostra notifiche in base al risultato.
    this.lexicalService.changeFormLabelReq$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        if (data) {
          let formId = data.formId;
          let newLabel = data.newLabel;
          console.log(this.formData); // Stampa per debug.

          this.formData.forEach((attestation) => {
            if (attestation.value == formId) {
              attestation.attributes.label = newLabel; // Aggiorna l'etichetta.

              // Effettua la richiesta di aggiornamento dell'annotazione e gestisce il risultato.
              this.annotatorService
                .updateAnnotation(attestation)
                .pipe(takeUntil(this.destroy$))
                .subscribe(
                  (data) => {
                    console.log(data); // Stampa per debug.
                    this.toastr.success(
                      'Attestation updated correctly',
                      'Info',
                      { timeOut: 5000 }
                    );
                  },
                  (error) => {
                    console.log(error); // Stampa l'errore per debug.
                    this.toastr.error(
                      'Error on updating attestation',
                      'Error',
                      { timeOut: 5000 }
                    );
                  }
                );
            }
          });
        }
      });
  }

  // Metodo ngOnChanges che rileva e gestisce le modifiche alle proprietà di input.
  ngOnChanges(changes: SimpleChanges) {
    console.log(changes); // Log delle modifiche per debug o verifica.

    // Controlla se `attestationData` è cambiata e non è null.
    if (changes.attestationData.currentValue != null) {
      // Inizializza le variabili per la nuova attestationData.
      this.formData = []; // Azzera l'array formData.
      this.selectedItem = null; // Reset dell'elemento selezionato.
      this.selectedAnnotation = null; // Reset dell'annotazione selezionata.
      this.typeDesc = ''; // Reset della descrizione del tipo.
      this.staticOtherDef = []; // Reset dell'array di definizioni statiche.
      this.labelData = []; // Reset dell'array dei dati delle etichette.

      // Assegna i nuovi dati di attestazione a formData.
      this.formData = changes.attestationData.currentValue;

      // Se formData contiene elementi, esegue il ciclo su di essi.
      if (this.formData.length > 0) {
        this.formData.forEach((attestation) => {
          // Verifica se l'attestazione ha attributi.
          if (attestation.attributes) {
            // Assicura che la bibliografia sia un array.
            if (!Array.isArray(attestation.attributes.bibliography)) {
              let tmp = [];
              // Se la bibliografia esiste, la inserisce in un array temporaneo.
              if (attestation.attributes.bibliography != undefined) {
                tmp.push(attestation.attributes.bibliography);
              }
              // Assegna l'array temporaneo alla bibliografia dell'attestazione.
              attestation.attributes.bibliography = tmp;
            }
          }
        });
      }

      // Gestisce il caso in cui non ci sono dati di attestazione.
      if (this.formData.length == 0) {
        // Nasconde il pannello di attestazione e resetta le variabili correlate.
        this.lexicalService.triggerAttestationPanel(false);
        this.typeDesc = '';
        this.staticOtherDef = [];
        this.labelData = [];
      } else {
        // Qui potrebbero essere aggiunte azioni da eseguire quando formData contiene elementi.
      }
    } else {
      // Se non ci sono nuovi dati di attestazione, resetta tutte le variabili.
      this.formData = [];
      this.typeDesc = '';
      this.staticOtherDef = [];
      this.labelData = [];
      this.selectedItem = null;
      this.selectedAnnotation = null;
    }
  }

  cancelAttestation(index, id, node_id, token_id?) {
    // Rimuove l'elemento specificato dall'array formData.
    this.formData.splice(index, 1);

    // Chiama il servizio annotator per eliminare la richiesta di annotazione specifica.
    this.annotatorService.deleteAnnotationRequest(id, node_id);

    // Effettua la cancellazione dell'attestazione e gestisce la risposta.
    this.annotatorService
      .deleteAnnotation(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Log della risposta e mostra una notifica di successo.
          console.log(data);
          this.toastr.success('Attestation deleted correctly', 'Info', {
            timeOut: 5000,
          });

          // Se esiste un token_id, procede con la sua eliminazione.
          if (token_id) {
            this.annotatorService
              .deleteToken(token_id)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  console.log(data);
                  // Se la cancellazione ha successo, elimina la richiesta di token associata.
                  if (data) {
                    this.annotatorService.deleteTokenRequest(token_id);
                  }
                },
                (error) => {
                  console.log(error);
                }
              );
          }

          // Chiude il pannello del modulo associato all'ID fornito.
          this.annotatorService.closePanelForm(id);

          // Se esistono componenti nell'arrayComponents, cerca quello con l'ID corrispondente e chiude il suo pannello modale.
          if (this.arrayComponents.length > 0) {
            this.arrayComponents.forEach((instanceComponent) => {
              if (instanceComponent.instance.id == id) {
                setTimeout(() => {
                  instanceComponent.instance.formPanelModal.hide();
                }, 100);
              }
            });
          }
        },
        (error) => {
          // Gestisce gli errori nella cancellazione e mostra una notifica di errore.
          console.log(error);
          this.toastr.error('Error on deleting attestation', 'Error', {
            timeOut: 5000,
          });
        }
      );

    // Se dopo la cancellazione l'array formData è vuoto, nasconde il pannello di attestazione.
    if (this.formData.length == 0) {
      this.lexicalService.triggerAttestationPanel(false);
    }
  }

  // Funzione per innescare l'aggiornamento di un'attestazione. Invia i dati relativi all'evento e ai nuovi valori al soggetto di aggiornamento.
  triggerUpdateAttestation(evt, newValue, propKey, annotation) {
    this.update_anno_subject.next({
      event: evt,
      newValue: newValue,
      propKey: propKey,
      annotation: annotation,
    });
  }

  // Funzione per gestire l'input ritardato (debouncing) su eventi di digitazione. Utilizzata per ridurre il numero di aggiornamenti inviati mentre l'utente digita.
  debounceKeyup(value, annotation, index, field) {
    this.update_biblio_anno_subject.next({
      v: value,
      a: annotation,
      i: index,
      f: field,
    });
  }

  // Funzione per aggiornare un'annotazione. Controlla se i dati sono non nulli e aggiorna l'attributo specificato dell'annotazione.
  updateAnnotation(data) {
    if (data != null) {
      let id_annotation = data?.annotation?.id; // Recupera l'ID dell'annotazione da aggiornare
      let newValue = data?.newValue; // Il nuovo valore per l'attributo specificato
      let property = data?.propKey; // La proprietà dell'annotazione da aggiornare

      let annotation = data?.annotation; // L'oggetto annotazione completo

      // Controlla se la proprietà da aggiornare è 'confidence' e modifica il suo valore in base all'input dell'utente
      if (property == 'confidence' && data.event.target.checked == true) {
        annotation.attributes.confidence = 0;
      } else if (
        property == 'confidence' &&
        data.event.target.checked == false
      ) {
        annotation.attributes.confidence = 1;
      } else {
        // Per tutte le altre proprietà, aggiorna semplicemente con il nuovo valore
        annotation.attributes[property] = newValue;
      }

      // Invia la richiesta di aggiornamento dell'annotazione al servizio annotator e gestisce la risposta
      this.annotatorService.updateAnnotation(annotation).subscribe(
        (data) => {
          console.log(data);
          this.toastr.success('Attestation updated correctly', 'Info', {
            timeOut: 5000,
          });
        },
        (error) => {
          console.log(error);
          this.toastr.error('Error on updating attestation', 'Error', {
            timeOut: 5000,
          });
        }
      );
    }
  }

  // Aggiorna l'annotazione bibliografica con i nuovi dati forniti
  updateBiblioAnnotation(data) {
    // Verifica se i dati forniti non sono nulli
    if (data != null) {
      console.log(data);

      // Estrae i dati necessari dall'oggetto data
      let id_annotation = data?.a.id; // ID dell'annotazione
      let newValue = data?.v; // Nuovo valore da aggiornare
      let index = data?.i; // Indice dell'elemento da aggiornare nell'attributo bibliografia
      let field = data?.f; // Campo dell'elemento da aggiornare

      // Scorre formData per trovare l'elemento con l'ID corrispondente e aggiorna il valore specifico
      this.formData.forEach((element) => {
        if (element.id == id_annotation) {
          element.attributes.bibliography[index][field] = newValue;
        }
      });

      // Log dell'annotazione aggiornata
      let annotation = data?.a;
      console.log(annotation);

      // Effettua la chiamata al servizio per aggiornare l'annotazione sul server
      this.annotatorService
        .updateAnnotation(annotation)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Mostra un messaggio di successo dopo l'aggiornamento
            this.toastr.success('Attestation updated correctly', 'Info', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            // Mostra un messaggio di errore in caso di problemi nell'aggiornamento
            this.toastr.error('Error on updating attestation', 'Error', {
              timeOut: 5000,
            });
          }
        );
    }
  }

  // Ottiene i dati di un form basandosi sull'ID del form e l'indice specificato
  getForm(formId, index) {
    // Ritarda l'esecuzione per garantire che il DOM sia aggiornato
    setTimeout(() => {
      console.log('#attestation_collapse-' + index + '');
      // Seleziona l'elemento del DOM basato sull'indice
      let item_collapse = this.accordion.nativeElement.querySelectorAll(
        '#attestation_collapse-' + index
      )[0];
      // Verifica se l'elemento è attualmente visibile (aperto)
      if (item_collapse.classList.contains('show')) {
        // Richiede i dati del form al servizio e li gestisce al suo arrivo
        this.lexicalService
          .getFormData(formId, 'core')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
            },
            (error) => {
              console.log(error);
            }
          );
      } else {
        // In caso l'elemento non sia visibile, non esegue operazioni
      }
      console.log(item_collapse);
    }, 500);
  }

  // Mostra un modal relativo a una annotazione bibliografica selezionata
  showBiblioModal(item) {
    this.selectedAnnotation = item; // Imposta l'annotazione selezionata
    this.modal.show(); // Visualizza il modal
  }

  // Controlla se nell'item fornito esiste un creatore con tipo 'author'
  checkIfCreatorExist(item?) {
    // Ritorna true se almeno un elemento soddisfa la condizione, altrimenti false
    return item.some((element) => element.creatorType === 'author');
  }

  // Funzione per selezionare un elemento della bibliografia.
  // 'evt' è l'evento clic, mentre 'i' è l'elemento su cui si è fatto clic.
  selectItem(evt, i) {
    // Se il tasto shift è premuto, non esegue alcuna azione.
    if (evt.shiftKey) {
    }
    // Scorre ogni elemento della bibliografia.
    this.bibliography.forEach((element) => {
      // Se la chiave dell'elemento corrisponde a quella dell'elemento cliccato.
      if (element.key == i.key) {
        // Inverte lo stato di selezione dell'elemento.
        element.selected = !element.selected;
        // Se l'elemento è selezionato, lo imposta come elemento selezionato, altrimenti annulla la selezione.
        element.selected
          ? (this.selectedItem = element)
          : (this.selectedItem = null);
        return true;
      } else {
        // Se l'elemento non corrisponde, deseleziona l'elemento.
        element.selected = false;
        return false;
      }
    });
  }

  // Funzione chiamata alla chiusura del modal.
  onCloseModal() {
    // Reset dell'elemento selezionato e dei parametri di inizializzazione per il caricamento dei dati.
    this.selectedItem = null;
    this.start = 0;
    this.sortField = 'title';
    this.direction = 'asc';
    // Reset dello scroll della tabella al top.
    this.tableBody.nativeElement.scrollTop = 0;
    // Memorizza i parametri di ordinamento attuali.
    this.memorySort = { field: this.sortField, direction: this.direction };
    // Carica i dati iniziali tramite il servizio bibliografico, con gestione della sottoscrizione e degli errori.
    this.biblioService
      .bootstrapData(this.start, this.sortField, this.direction)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.bibliography = data;
          // Imposta tutti gli elementi come non selezionati.
          this.bibliography.forEach((element) => {
            element['selected'] = false;
          });
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // Gestisce lo scroll verso il basso nella modalità bibliografia.
  onScrollDown() {
    // Mostra il modal della bibliografia e gestisce l'aspetto e la funzionalità del backdrop.
    //@ts-ignore
    $('#biblioModalAnnotation').modal('show');
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({ backdrop: 'static', keyboard: false });
    $('.modal-backdrop').appendTo('.table-body');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');

    // Incrementa il valore di start per caricare i successivi 25 elementi.
    this.start += 25;

    // Se c'è un titolo di ricerca specificato, filtra la bibliografia in base a tale titolo.
    if (this.queryTitle != '') {
      this.biblioService
        .filterBibliography(
          this.start,
          this.sortField,
          this.direction,
          this.queryTitle,
          this.queryMode
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Nasconde il modal e rimuove il backdrop una volta che i dati sono stati caricati.
            //@ts-ignore
            $('#biblioModalAnnotation').modal('hide');
            $('.modal-backdrop').remove();
            // Aggiunge i nuovi elementi filtrati alla bibliografia.
            data.forEach((element) => {
              this.bibliography.push(element);
            });
          },
          (error) => {
            console.log(error);
          }
        );
    } else {
      // Se non c'è un titolo specificato, carica semplicemente i successivi 25 elementi senza filtrarli.
      this.biblioService
        .filterBibliography(
          this.start,
          this.sortField,
          this.direction,
          this.queryTitle,
          this.queryMode
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Aggiunge i nuovi elementi alla bibliografia.
            data.forEach((element) => {
              this.bibliography.push(element);
            });

            // Nasconde il modal e rimuove il backdrop.
            //@ts-ignore
            $('#biblioModalAnnotation').modal('hide');
            $('.modal-backdrop').remove();
          },
          (error) => {
            console.log(error);
          }
        );
    }
  }

  // Funzione per aggiungere un elemento bibliografico.
  // Se l'elemento è definito, ne estrae le informazioni rilevanti e le aggiunge alla bibliografia dell'annotazione selezionata.
  // Gestisce anche la visualizzazione della modalità e la comunicazione con il servizio di annotazione per aggiornare l'annotazione con i nuovi dati bibliografici.
  addBibliographyItem(item?) {
    // Mostra la modalità per l'aggiunta bibliografica e ne configura il comportamento (statico, senza chiusura alla pressione di tasti esterni).
    //@ts-ignore
    $('#biblioModalAnnotation').modal('show');
    $('.modal-backdrop').appendTo('.ui-modal');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({ backdrop: 'static', keyboard: false });

    // Regola lo stile del backdrop e rimuove la classe che indica l'apertura di una modalità dal body.
    $('.modal-backdrop').css('height', 'inherit');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');

    // Se l'elemento passato alla funzione è definito, ne estrae le informazioni.
    if (item != undefined) {
      let id = item.data.key != undefined ? item.data.key : '';
      let title = item.data.title != undefined ? item.data.title : '';
      let author;

      // Estrae l'autore dall'elenco dei creatori, se presente.
      item.data.creators.forEach((element) => {
        if (element.creatorType == 'author') {
          author = element.lastName + ' ' + element.firstName;
          return true;
        } else {
          return false;
        }
      });
      author = author != undefined ? author : '';
      let date = item.data.date != undefined ? item.data.date : '';
      let url = item.data.url != undefined ? item.data.url : '';
      let seeAlsoLink = '';

      // Resetta alcuni campi dell'elemento.
      item.data['note'] = '';
      item.data['textualRef'] = '';

      let parameters = {
        id: id,
        title: title,
        author: author,
        date: date,
        url: url,
        seeAlsoLink: seeAlsoLink,
      };

      // Log dell'elemento e dell'annotazione selezionata, poi chiude la modalità.
      console.log(item, this.selectedAnnotation);
      this.modal.hide();

      let anno_id = this.selectedAnnotation.id;

      // Aggiunge l'elemento alla bibliografia dell'attestazione selezionata.
      this.formData.forEach((attestation) => {
        if (attestation.id == anno_id) {
          console.log(attestation);
          attestation?.attributes?.bibliography.push(item?.data);
        }
      });

      // Invia la richiesta di aggiornamento dell'annotazione e gestisce la risposta o l'errore.
      this.annotatorService
        .updateAnnotation(this.selectedAnnotation)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            //@ts-ignore
            $('#biblioModalAnnotation').modal('hide');
            $('.modal-backdrop').remove();
            this.modal.hide();
            this.toastr.success('Item added correctly', 'Info', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            //@ts-ignore
            $('#biblioModalAnnotation').modal('hide');
            $('.modal-backdrop').remove();
            this.modal.hide();
            this.toastr.error('Error on adding item', 'Info', {
              timeOut: 5000,
            });
          }
        );
    }
  }

  // Funzione per ordinare la bibliografia.
  // Modifica la direzione dell'ordinamento in base al campo selezionato.
  // Gestisce anche la visualizzazione della modalità e l'inizio del processo di filtro della bibliografia.
  sortBibliography(evt?, val?) {
    // Verifica se il campo di ordinamento corrente è lo stesso del nuovo campo selezionato e inverte la direzione di ordinamento.
    if (this.memorySort.field == val) {
      if (this.direction == 'asc') {
        this.direction = 'desc';
        this.memorySort.direction = 'desc';
      } else {
        this.direction = 'asc';
        this.memorySort.direction = 'asc';
      }
    } else {
      this.sortField = val;
      this.direction = 'asc';
      this.memorySort = { field: this.sortField, direction: this.direction };
    }

    // Mostra la modalità e la configura per rimanere fissa.
    //@ts-ignore
    $('#biblioModalAnnotation').modal('show');
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({ backdrop: 'static', keyboard: false });
    $('.modal-backdrop').appendTo('.table-body');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    this.start = 0;
    this.tableBody.nativeElement.scrollTop = 0;

    // Avvia il processo di filtro della bibliografia con i nuovi parametri di ordinamento e gestisce la risposta o l'errore.
    this.biblioService
      .filterBibliography(
        this.start,
        this.sortField,
        this.direction,
        this.queryTitle,
        this.queryMode
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          this.bibliography = [];
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();
          data.forEach((element) => {
            this.bibliography.push(element);
          });
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // Rimuove un elemento dalla lista di bibliografia annotata e aggiorna l'annotazione sul server
  removeItem(item, j) {
    console.log(item, j);

    // Scorre ogni annotazione in formData e rimuove l'elemento specificato da bibliography se gli ID corrispondono
    this.formData.forEach((annotation) => {
      if (item?.id == annotation.id) {
        annotation.attributes.bibliography.splice(j, 1);
      }
    });

    // Chiama il servizio annotator per aggiornare l'annotazione e gestisce la risposta o l'errore
    this.annotatorService
      .updateAnnotation(item)
      .pipe(takeUntil(this.destroy$)) // Assicura che la sottoscrizione venga interrotta quando il componente viene distrutto
      .subscribe(
        (data) => { // Gestisce la risposta di successo
          console.log(data);
          this.toastr.success('Attestazione rimossa correttamente', 'Info', {
            timeOut: 5000,
          });
        },
        (error) => { // Gestisce l'errore
          console.log(error);
          this.toastr.error('Errore nella rimozione dell\'attestazione', 'Errore', {
            timeOut: 5000,
          });
        }
      );
    console.log(this.formData, item);
  }

  // Innesca la ricerca basata su un evento di tastiera, evitando i tasti di controllo
  triggerSearch(evt, query, queryMode) {
    // Ignora l'evento se il tasto premuto è Control, Shift o Alt
    if (evt.key != 'Control' && evt.key != 'Shift' && evt.key != 'Alt') {
      this.searchSubject.next({ query, queryMode }); // Emette l'evento di ricerca con i parametri forniti
    }
  }

  // Avvia la ricerca nella bibliografia
  searchBibliography(query?: string, queryMode?: any) {
    // Reimposta le variabili per la nuova ricerca
    this.start = 0;
    this.selectedItem = null;
    // Mostra il modale di annotazione della bibliografia
    //@ts-ignore
    $('#biblioModalAnnotation').modal('show');
    $('.modal-backdrop').appendTo('.table-body');
    // Imposta il modale per non chiudersi con il click esterno o la pressione del tasto Esc
    //@ts-ignore
    $('#biblioModalAnnotation').modal({ backdrop: 'static', keyboard: false });
    // Reimposta lo stato visivo del modale e della pagina
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    // Reimposta lo scroll del corpo della tabella
    this.tableBody.nativeElement.scrollTop = 0;
    // Se il titolo della query non è vuoto, esegue la ricerca
    if (this.queryTitle != '') {
      this.biblioService
        .filterBibliography(
          this.start,
          this.sortField,
          this.direction,
          this.queryTitle,
          this.queryMode
        )
        .pipe(takeUntil(this.destroy$)) // Assicura che la sottoscrizione venga interrotta quando il componente viene distrutto
        .subscribe(
          (data) => { // Gestisce la risposta di successo
            console.log(data);
            this.bibliography = []; // Reimposta la bibliografia con i nuovi risultati
            data.forEach((element) => {
              this.bibliography.push(element);
            });
            // Nasconde il modale di annotazione della bibliografia
            //@ts-ignore
            $('#biblioModalAnnotation').modal('hide');
            $('.modal-backdrop').remove(); // Rimuove il backdrop del modale
          },
          (error) => { // Gestisce l'errore
            console.log(error);
          }
        );
    } else {
      // La logica si ripete per il caso in cui il titolo della query sia vuoto, potrebbe essere ottimizzata per evitare ripetizioni
      this.biblioService
        .filterBibliography(
          this.start,
          this.sortField,
          this.direction,
          this.queryTitle,
          this.queryMode
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.bibliography = [];
            data.forEach((element) => {
              this.bibliography.push(element);
            });
            //@ts-ignore
            $('#biblioModalAnnotation').modal('hide');
            $('.modal-backdrop').remove();
          },
          (error) => {
            console.log(error);
          }
        );
    }
  }
  158;

  // Carica i dati del modulo per un'annotazione specifica
  loadFormData(idAnnotation, formId, label) {
    console.log(idAnnotation);
    // Ottiene il pannello del modulo per l'ID dell'annotazione specificata
    let panel = this.annotatorService.getPanelForm(idAnnotation);
    if (panel == undefined) { // Se il pannello non esiste, lo richiede al servizio lexico
      this.lexicalService
        .getFormData(formId, 'core')
        .pipe(takeUntil(this.destroy$)) // Assicura che la sottoscrizione venga interrotta quando il componente viene distrutto
        .subscribe(
          (data) => {
            console.log(data);
            if (data != undefined) { // Se i dati del modulo sono disponibili, crea un nuovo pannello di modulo
              this.annotatorService.newPanelForm(idAnnotation);
              // Crea il componente del pannello di modulo dinamicamente
              const factory =
                this.factory.resolveComponentFactory(FormPanelComponent);
              const componentRef = this.vc.createComponent(factory);
              // Aggiunge il componente creato all'array dei componenti
              this.arrayComponents.push(componentRef);
              // Imposta le proprietà del componente con i dati del modulo
              (<FormPanelComponent>componentRef.instance).label =
                label + ' - ' + data.label[0].propertyValue;
              (<FormPanelComponent>componentRef.instance).formId = formId;
              (<FormPanelComponent>componentRef.instance).id = idAnnotation;
              (<FormPanelComponent>componentRef.instance).formData = data;
              // Innesca il caricamento del pannello del modulo
              (<FormPanelComponent>componentRef.instance).triggerFormPanel();
            }
          },
          (error) => { // Gestisce l'errore
            console.log(error);
          }
        );
    } else {
      // Se il pannello esiste già, non esegue alcuna azione
    }
  }

  // Pulisce le risorse quando il componente viene distrutto
  ngOnDestroy(): void {
    this.destroy$.next(true); // Segnala che il componente è in fase di distruzione
    this.destroy$.complete(); // Completa l'Observable per evitare perdite di memoria
  }

}
