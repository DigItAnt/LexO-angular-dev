/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-note-panel',
  templateUrl: './note-panel.component.html',
  styleUrls: ['./note-panel.component.scss'],
})
export class NotePanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() noteData: string;
  object: any;
  private subject: Subject<string> = new Subject();

  note_subscription: Subscription;
  lex_entry_update_subscription: Subscription;
  form_update_subscription: Subscription;
  sense_update_subscription: Subscription;
  etymology_update_subscription: Subscription;

  destroy$: Subject<boolean> = new Subject();

  // Questo decorator @HostListener ascolta gli eventi di pressione dei tasti sulla finestra e chiama la funzione keyEvent quando si verifica un evento.
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    /* //console.log(event) */
    // Impedisce il comportamento predefinito associato all'evento di pressione del tasto.
    event.preventDefault();
    // Ferma la propagazione dell'evento, impedendo che altri gestori di eventi vengano chiamati.
    event.stopPropagation();
    // Ritorna dalla funzione keyEvent.
    return;
  }

  // Variabile che rappresenta il contenuto HTML dell'editor.
  htmlContent: '';

  // Configurazione dell'editor Angular.
  editorConfig: AngularEditorConfig = {
    // L'editor è modificabile.
    editable: true,
    // Controllo ortografico abilitato.
    spellcheck: true,
    // Altezza automatica dell'editor.
    height: 'auto',
    // Altezza minima dell'editor.
    minHeight: '0',
    // Altezza massima dell'editor.
    maxHeight: '150px',
    // Larghezza automatica dell'editor.
    width: 'auto',
    // Larghezza minima dell'editor.
    minWidth: '0',
    // Traduzione abilitata.
    translate: 'yes',
    // Toolbar abilitata.
    enableToolbar: true,
    // Mostra la toolbar.
    showToolbar: true,
    // Testo di esempio visualizzato quando l'editor è vuoto.
    placeholder: 'Inserisci il testo qui...',
    // Nessun separatore di paragrafo predefinito.
    defaultParagraphSeparator: '',
    // Classi personalizzate per l'editor.
    customClasses: [
      {
        name: 'quote',
        class: 'quote',
      },
      {
        name: 'redText',
        class: 'redText',
      },
      {
        name: 'titleText',
        class: 'titleText',
        tag: 'h1',
      },
    ],
    // URL per caricare le immagini.
    uploadUrl: 'v1/image',
    // Non utilizzare le credenziali durante l'upload.
    uploadWithCredentials: false,
    // Sanitizzazione del contenuto HTML abilitata.
    sanitize: true,
    // Posizione della toolbar (in alto).
    toolbarPosition: 'top',
    // Pulsanti nascosti nella toolbar.
    toolbarHiddenButtons: [
      [
        'undo',
        'redo',
        'strikeThrough',
        'justifyLeft',
        'justifyCenter',
        'justifyRight',
        'justifyFull',
        'indent',
        'outdent',
        'insertUnorderedList',
        'insertOrderedList',
        'heading',
        'fontName',
      ],
      [
        'fontSize',
        'textColor',
        'backgroundColor',
        'customClasses',
        'link',
        'unlink',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'toggleEditorMode',
      ],
    ],
  };

  constructor(
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService,
    private conceptService: ConceptService
  ) {}

  ngOnInit(): void {
    this.editorConfig.editable = false;

    this.subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((newNote) => {
        if (this.noteData != null && newNote != this.object.note) {
          this.lexicalService.spinnerAction('on');
          console.log(this.object);
          //console.log(this.object)
          // Verifica se il campo 'lexicalEntry' è definito e i campi 'form' e 'sense' sono indefiniti
          if (
            this.object.lexicalEntry != undefined &&
            this.object.form == undefined &&
            this.object.sense == undefined
          ) {
            // Ottieni l'ID della voce lessicale
            var lexId = this.object.lexicalEntry;
            // Definisci i parametri per l'aggiornamento della nota
            var parameters = {
              relation: 'http://www.w3.org/2004/02/skos/core#note',
              value: newNote,
            };
            // Effettua la chiamata al servizio per aggiornare la voce lessicale
            this.lexicalService
              .updateLexicalEntry(lexId, parameters)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  // Aggiorna i dati dopo la modifica
                  data['request'] = 0;
                  data['new_note'] = newNote;
                  this.lexicalService.refreshAfterEdit(data);
                  this.lexicalService.spinnerAction('off');
                  // Visualizza un messaggio di successo
                  this.toastr.success('Note updated', '', {
                    timeOut: 5000,
                  });

                  // Aggiorna il campo 'note' dell'oggetto corrente
                  this.object.note = newNote;
                },
                (error) => {
                  // Gestisci gli errori
                  if (error.status != 200) {
                    // Visualizza un messaggio di errore
                    this.toastr.error(error.error, '', {
                      timeOut: 5000,
                    });
                  } else if (error.status == 200) {
                    // Aggiorna i dati dopo la modifica
                    const data = this.object;
                    data['request'] = 0;
                    data['new_note'] = newNote;
                    this.lexicalService.refreshAfterEdit(data);
                    // Aggiorna la scheda principale
                    this.lexicalService.updateCoreCard({
                      lastUpdate: error.error.text,
                    });
                    this.lexicalService.spinnerAction('off');

                    // Visualizza un messaggio di successo
                    this.toastr.success('Note updated', '', {
                      timeOut: 5000,
                    });

                    // Aggiorna il campo 'note' dell'oggetto corrente
                    this.object.note = newNote;
                  }
                }
              );
          } else if (this.object.form != undefined) {
            // Se il campo 'form' è definito
            var formId = this.object.form;
            // Definisci i parametri per l'aggiornamento della nota
            var parameters = {
              relation: 'http://www.w3.org/2004/02/skos/core#note',
              value: newNote,
            };
            // Effettua la chiamata al servizio per aggiornare il modulo
            this.lexicalService
              .updateForm(formId, parameters)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  // Aggiorna i dati dopo la modifica
                  data['request'] = 0;
                  data['new_note'] = newNote;
                  this.lexicalService.refreshAfterEdit(data);
                  this.lexicalService.spinnerAction('off');
                  // Visualizza un messaggio di successo
                  this.toastr.success('Note updated', '', {
                    timeOut: 5000,
                  });

                  // Aggiorna il campo 'note' dell'oggetto corrente
                  this.object.note = newNote;
                },
                (error) => {
                  // Gestisci gli errori
                  if (error.status != 200) {
                    // Disattiva lo spinner e visualizza un messaggio di errore
                    this.lexicalService.spinnerAction('off');
                    this.toastr.error(error.error, '', {
                      timeOut: 5000,
                    });
                  } else if (error.status == 200) {
                    // Aggiorna i dati dopo la modifica
                    const data = this.object;
                    data['request'] = 0;
                    data['new_note'] = newNote;
                    this.lexicalService.refreshAfterEdit(data);
                    // Aggiorna la scheda principale
                    this.lexicalService.updateCoreCard({
                      lastUpdate: error.error.text,
                    });
                    this.lexicalService.spinnerAction('off');
                    // Visualizza un messaggio di successo
                    this.toastr.success('Note updated', '', {
                      timeOut: 5000,
                    });

                    // Aggiorna il campo 'note' dell'oggetto corrente
                    this.object.note = newNote;
                  }
                }
              );
          }
          // Se l'oggetto ha un attributo 'sense' definito
          else if (this.object.sense != undefined) {
            // Recupera l'identificatore del senso
            var senseId = this.object.sense;
            // Definisce i parametri per l'aggiornamento
            var parameters = {
              relation: 'http://www.w3.org/2004/02/skos/core#note',
              value: newNote,
            };
            // Chiama il servizio per aggiornare il senso con i nuovi parametri
            this.lexicalService
              .updateSense(senseId, parameters)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  // Aggiorna i dati ottenuti dalla risposta
                  data['request'] = 0;
                  data['new_note'] = newNote;
                  // Richiama una funzione per aggiornare l'interfaccia dopo la modifica
                  this.lexicalService.refreshAfterEdit(data);
                  // Disattiva l'indicatore di caricamento
                  this.lexicalService.spinnerAction('off');
                  // Visualizza una notifica di successo
                  this.toastr.success('Nota aggiornata', '', {
                    timeOut: 5000,
                  });
                  // Aggiorna l'attributo 'note' dell'oggetto con la nuova nota
                  this.object.note = newNote;
                },
                (error) => {
                  // In caso di errore, gestisce l'eccezione
                  const data = this.object;
                  data['request'] = 0;
                  data['new_note'] = newNote;
                  // Richiama una funzione per aggiornare l'interfaccia dopo la modifica
                  this.lexicalService.refreshAfterEdit(data);
                  // Aggiorna la scheda centrale con un messaggio di errore
                  this.lexicalService.updateCoreCard({
                    lastUpdate: error.error.text,
                  });
                  // Disattiva l'indicatore di caricamento
                  this.lexicalService.spinnerAction('off');
                  // Se lo status dell'errore è 200, visualizza una notifica di successo
                  if (error.status == 200) {
                    this.toastr.success('Nota aggiornata', '', {
                      timeOut: 5000,
                    });
                  }
                  // Aggiorna l'attributo 'note' dell'oggetto con la nuova nota
                  this.object.note = newNote;
                }
              );
          }
          // Se l'oggetto ha un attributo 'etymology' definito
          else if (this.object.etymology != undefined) {
            // Recupera l'identificatore dell'etimologia
            var etymId = this.object.etymology;
            // Definisce i parametri per l'aggiornamento
            var parameters = {
              relation: 'http://www.w3.org/2004/02/skos/core#note',
              value: newNote,
            };
            // Chiama il servizio per aggiornare l'etimologia con i nuovi parametri
            this.lexicalService
              .updateEtymology(etymId, parameters)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  // Aggiorna i dati ottenuti dalla risposta
                  data['request'] = 0;
                  data['new_note'] = newNote;
                  // Richiama una funzione per aggiornare l'interfaccia dopo la modifica
                  this.lexicalService.refreshAfterEdit(data);
                  // Disattiva l'indicatore di caricamento
                  this.lexicalService.spinnerAction('off');
                  // Visualizza una notifica di successo
                  this.toastr.success('Nota aggiornata', '', {
                    timeOut: 5000,
                  });
                  // Aggiorna l'attributo 'note' dell'oggetto con la nuova nota
                  this.object.note = newNote;
                },
                (error) => {
                  // In caso di errore, gestisce l'eccezione
                  const data = this.object;
                  data['request'] = 0;
                  data['new_note'] = newNote;
                  // Richiama una funzione per aggiornare l'interfaccia dopo la modifica
                  this.lexicalService.refreshAfterEdit(data);
                  // Aggiorna la scheda centrale con un messaggio di errore
                  this.lexicalService.updateCoreCard({
                    lastUpdate: error.error.text,
                  });
                  // Disattiva l'indicatore di caricamento
                  this.lexicalService.spinnerAction('off');
                  // Se lo status dell'errore è 200, visualizza una notifica di successo
                  if (error.status == 200) {
                    this.toastr.success('Nota aggiornata', '', {
                      timeOut: 5000,
                    });
                  }
                  // Aggiorna l'attributo 'note' dell'oggetto con la nuova nota
                  this.object.note = newNote;
                }
              );
          } else if (this.object.lexicalConcept != undefined) {
            // Memorizza l'identificatore del concetto lessicale
            let lexicalConceptID = this.object.lexicalConcept;

            // Dichiarazione di un oggetto per i parametri
            let parameters = {};

            // Verifica se la nuova nota è vuota
            if (newNote == '') {
              // Se la nuova nota è vuota, prepara i parametri per la cancellazione della relazione
              parameters = {
                relation: 'http://www.w3.org/2004/02/skos/core#note',
                value: this.object.lexicalConcept,
              };

              // Chiamata al servizio per cancellare la relazione della nota
              this.conceptService
                .deleteRelation(this.object.lexicalConcept, parameters)
                .pipe(takeUntil(this.destroy$))
                .subscribe(
                  (data) => {
                    console.log(data);
                  },
                  (error) => {
                    // Gestione degli errori durante la cancellazione della relazione
                    if (error.status != 200) {
                      // Mostra un messaggio di errore all'utente
                      this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                      });
                    } else {
                      // Aggiorna la nota con la nuova nota vuota
                      this.object.note = newNote;
                      // Disattiva lo spinner di caricamento
                      this.lexicalService.spinnerAction('off');
                      // Aggiorna la scheda principale del servizio lessicale con l'ultimo aggiornamento
                      this.lexicalService.updateCoreCard({
                        lastUpdate: error.error.text,
                      });
                      // Mostra un messaggio di successo all'utente
                      this.toastr.success(
                        'Note changed correctly for ' +
                          this.object.lexicalConcept,
                        '',
                        {
                          timeOut: 5000,
                        }
                      );
                    }
                  }
                );
            } else {
              // Se la nuova nota non è vuota, prepara i parametri per l'aggiornamento della nota
              parameters = {
                relation: 'http://www.w3.org/2004/02/skos/core#note',
                source: this.object.lexicalConcept,
                target: newNote,
                oldTarget: this.object.note,
                targetLanguage: this.object.language,
                oldTargetLanguage: this.object.language,
              };

              // Chiamata al servizio per aggiornare la proprietà della nota
              this.conceptService
                .updateNoteProperty(parameters)
                .pipe(takeUntil(this.destroy$))
                .subscribe(
                  (data) => {
                    console.log(data);
                  },
                  (error) => {
                    // Gestione degli errori durante l'aggiornamento della nota
                    console.log(error);

                    //this.lexicalService.changeDecompLabel(next)
                    if (error.status != 200) {
                      // Mostra un messaggio di errore all'utente
                      this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                      });
                    } else {
                      // Disattiva lo spinner di caricamento
                      this.lexicalService.spinnerAction('off');
                      // Aggiorna la scheda principale del servizio lessicale con l'ultimo aggiornamento
                      this.lexicalService.updateCoreCard({
                        lastUpdate: error.error.text,
                      });
                      // Mostra un messaggio di successo all'utente
                      this.toastr.success(
                        'Note changed correctly for ' +
                          this.object.lexicalConcept,
                        '',
                        {
                          timeOut: 5000,
                        }
                      );

                      // Aggiorna la nota con la nuova nota
                      this.object.note = newNote;
                    }
                  }
                );
            }
          }
        }
      });

    // Questo codice si occupa di gestire la sottoscrizione all'observable `deleteReq$` fornito dal servizio `lexicalService`.
    // `deleteReq$` è un observable che emette dati relativi alla richiesta di eliminazione.

    // Si inizia invocando il metodo `pipe` sull'observable `deleteReq$` per comporre una catena di operatori.
    // L'operatore `takeUntil` viene utilizzato per interrompere la sottoscrizione quando l'observable `destroy$` emette un valore.

    this.lexicalService.deleteReq$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        // All'interno della sottoscrizione, quando viene emesso un dato:

        // Viene impostata la proprietà `editable` dell'oggetto `editorConfig` a `false`,
        // probabilmente per disabilitare la modalità di modifica dell'editor.
        this.editorConfig.editable = false;

        // La variabile `noteData` viene azzerata, probabilmente per resettare i dati relativi alla nota.
        this.noteData = null;

        // La variabile `object` viene azzerata, probabilmente per resettare l'oggetto corrente.
        this.object = null;
      });
  }

  /**
   * Questo metodo viene chiamato quando ci sono cambiamenti nei dati di input del componente.
   * Controlla se i dati della nota sono nulli e aggiorna di conseguenza lo stato del componente.
   * Se i dati della nota sono nulli, disabilita la modifica dell'editor e azzera i dati della nota e l'oggetto.
   * Se i dati della nota non sono nulli, abilita la modifica dell'editor e aggiorna i dati della nota e l'oggetto.
   * @param changes Oggetti che contengono i cambiamenti nei dati di input del componente.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes.noteData.currentValue == null) {
      this.editorConfig.editable = false;
      this.noteData = null;
      this.object = null;
    } else {
      this.editorConfig.editable = true;
      this.noteData = changes.noteData.currentValue.note;
      /* if(changes.noteData.currentValue.lexicalConcept){
      this.noteData = '';
    } */
      this.object = changes.noteData.currentValue;
    }

    /* //console.log(changes) */
  }

  /**
   * Questo metodo gestisce gli eventi di modifica dell'editor.
   * Invia i dati della nota al subject solo se il tasto premuto non è 'Control' o 'Shift' e non è premuto il tasto 'Ctrl'.
   * @param evt Oggetto che rappresenta l'evento di modifica dell'editor.
   */
  onChanges(evt) {
    if (evt.key != 'Control' || evt.key != 'Shift' || !evt.ctrlKey) {
      this.subject.next(this.noteData);
    }
  }

  /**
   * Questo metodo gestisce gli eventi di copia e incolla nell'editor.
   * Aggiorna il subject con i dati della nota ogni volta che viene eseguita un'operazione di copia o incolla.
   * @param evt Oggetto che rappresenta l'evento di copia o incolla nell'editor.
   */
  onCopyPaste(evt) {
    // Esegui qualsiasi operazione quando viene effettuata una copia o un incolla
    // Se vuoi che il subject venga aggiornato anche durante le operazioni di copia e incolla, aggiungi qui:
    // this.subject.next(this.noteData);
    this.subject.next(this.noteData);
  }

  /**
   * Questo metodo viene chiamato quando il componente viene distrutto.
   * Esegue la pulizia delle risorse e completa il subject.
   */
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
