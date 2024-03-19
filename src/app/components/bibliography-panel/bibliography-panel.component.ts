/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { debounceTime, take, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-bibliography-panel',
  templateUrl: './bibliography-panel.component.html',
  styleUrls: ['./bibliography-panel.component.scss'],
})
export class BibliographyPanelComponent implements OnInit, OnDestroy {
  @Input() biblioData: any[];
  bibliographyData: any[];
  object: any;
  countElement = 0;
  loadingSynchro = [];
  bibliographyForm = new FormGroup({
    bibliography: new FormArray([this.createBibliography()]),
  });
  biblioArray: FormArray;
  memoryNote = [];
  memoryTextualRef = [];
  destroy$: Subject<boolean> = new Subject();
  private subject: Subject<any> = new Subject();

  add_biblio_req_subscription: Subscription;
  subject_subscription: Subscription;

  constructor(
    private lexicalService: LexicalEntriesService,
    private biblioService: BibliographyService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Crea il form per la bibliografia utilizzando FormBuilder
    this.bibliographyForm = this.formBuilder.group({
      bibliography: this.formBuilder.array([]), // Definisce un array formabile per gli elementi della bibliografia
    });

    // Sottoscrive alla fonte di eventi addBiblioReq$ per ricevere nuovi elementi di bibliografia
    this.add_biblio_req_subscription =
      this.biblioService.addBiblioReq$.subscribe((incomingBiblio) => {
        if (incomingBiblio != null) {
          // Controlla se l'elemento ricevuto non è nullo

          // Assegna valori predefiniti se le proprietà dell'oggetto incomingBiblio non sono definite
          let id = incomingBiblio.id != undefined ? incomingBiblio.id : '';
          let title =
            incomingBiblio.title != undefined ? incomingBiblio.title : '';
          let author =
            incomingBiblio.author != undefined ? incomingBiblio.author : '';
          let date =
            incomingBiblio.date != undefined ? incomingBiblio.date : '';
          let note =
            incomingBiblio.note != undefined ? incomingBiblio.note : '';
          let textualReference =
            incomingBiblio.textualReference != undefined
              ? incomingBiblio.textualReference
              : '';

          // Aggiunge l'elemento di bibliografia ricevuto all'array di dati per la bibliografia
          this.bibliographyData.push(incomingBiblio);

          // Aggiunge un nuovo elemento di bibliografia al form
          this.addBibliographyElement(
            id,
            title,
            author,
            date,
            note,
            textualReference
          );

          // Memorizza note e riferimenti testuali ricevuti per uso futuro
          this.memoryNote.push(note);
          this.memoryTextualRef.push(textualReference);

          // Incrementa il conteggio degli elementi aggiunti
          this.countElement++;
        } else {
          // Azzera gli oggetti se l'elemento ricevuto è nullo
          this.object = null;
          this.bibliographyData = null;
        }
      });

    // Sottoscrive a un soggetto con debounce e takeUntil per gestire le modifiche
    this.subject_subscription = this.subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        // Gestisce le modifiche ricevute dopo il debounce
        this.onChanges(data);
      });
  }

  // Metodo ngOnChanges, invocato quando Angular setta o resetta le proprietà di input di una direttiva.
  // È utilizzato per rilevare e agire su cambiamenti di input properti specifiche.
  ngOnChanges(changes: SimpleChanges) {
    // Controlla se `biblioData` è cambiato e non è undefined.
    if (changes.biblioData.currentValue != undefined) {
      // Assegna il nuovo valore di `biblioData` a `object`.
      this.object = changes.biblioData.currentValue;
      // Inizializza le variabili per gestire i dati di bibliografia.
      this.bibliographyData = [];
      this.countElement = 0;
      this.memoryNote = [];
      this.memoryTextualRef = [];
      // Ottiene la FormArray `bibliography` dal formulario.
      this.biblioArray = this.bibliographyForm.get('bibliography') as FormArray;
      // Pulisce gli elementi presenti nella FormArray.
      this.biblioArray.clear();

      // Gestisce il caso in cui è presente `lexicalEntry` ma non `form`.
      if (
        this.object.lexicalEntry != undefined &&
        this.object.form == undefined
      ) {
        // Ottiene l'ID di `lexicalEntry`.
        let lexId = this.object.lexicalEntry;
        // Richiama `getBibliographyData` per ottenere i dati di bibliografia e si iscrive ai risultati.
        this.lexicalService
          .getBibliographyData(lexId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              // Se i dati ricevuti non sono vuoti, li elabora.
              if (Array.from(data).length > 0) {
                let count = 0;
                data.forEach((element) => {
                  // Aggiunge i dati di bibliografia all'array.
                  this.bibliographyData.push(element);
                  // Aggiunge gli elementi di bibliografia al formulario.
                  this.addBibliographyElement(
                    element.id,
                    element.title,
                    element.author,
                    element.date,
                    element.note,
                    element.textualReference
                  );
                  // Memorizza note e riferimenti testuali.
                  this.memoryNote[count] = element.note;
                  this.memoryTextualRef[count] = element.textualReference;
                  count++;
                  this.countElement++;
                });
              }
            },
            (error) => {
              // Gestisce eventuali errori nella richiesta.
              if (error.status == 200) {
                // Nessuna azione specifica se lo stato è 200.
              } else {
                // Mostra un messaggio di errore se lo stato è diverso da 200.
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
      } else if (this.object.form != undefined) {
        // Simile al caso di `lexicalEntry`, ma per `form`.
        let formId = this.object.form;
        this.lexicalService
          .getBibliographyData(formId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              let count = 0;
              data.forEach((element) => {
                this.bibliographyData.push(element);
                this.addBibliographyElement(
                  element.id,
                  element.title,
                  element.author,
                  element.date,
                  element.note,
                  element.textualReference
                );
                this.memoryNote[count] = element.note;
                this.memoryTextualRef[count] = element.textualReference;
                count++;
                this.countElement++;
              });
              // Aggiunge le etichette specifiche per `form`.
              this.bibliographyData['parentNodeLabel'] = this.object['form'];
              this.bibliographyData['form'] = this.object['form'];
            },
            (error) => {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
              console.log(error);
            }
          );
      } else if (this.object.sense != undefined) {
        // Gestisce i dati di bibliografia per `sense`.
        let senseId = this.object.sense;
        this.lexicalService
          .getBibliographyData(senseId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              let count = 0;
              data.forEach((element) => {
                this.bibliographyData.push(element);
                this.addBibliographyElement(
                  element.id,
                  element.title,
                  element.author,
                  element.date,
                  element.note,
                  element.textualReference
                );
                this.memoryNote[count] = element.note;
                this.memoryTextualRef[count] = element.textualReference;
                count++;
                this.countElement++;
              });
              // Aggiunge le etichette specifiche per `sense`.
              this.bibliographyData['parentNodeLabel'] = this.object['sense'];
              this.bibliographyData['sense'] = this.object['sense'];
            },
            (error) => {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
              console.log(error);
            }
          );
      } else if (this.object.etymology != undefined) {
        // Gestisce i dati di bibliografia per `etymology`.
        let etymId = this.object.etymology;
        this.lexicalService
          .getBibliographyData(etymId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              let count = 0;
              data.forEach((element) => {
                this.bibliographyData.push(element);
                this.addBibliographyElement(
                  element.id,
                  element.title,
                  element.author,
                  element.date,
                  element.note,
                  element.textualReference
                );
                this.memoryNote[count] = element.note;
                this.memoryTextualRef[count] = element.textualReference;
                count++;
                this.countElement++;
              });
              // Aggiunge le etichette specifiche per `etymology`.
              this.bibliographyData['parentNodeLabel'] =
                this.object['etymology'];
              this.bibliographyData['etymology'] = this.object['etymology'];
            },
            (error) => {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
              console.log(error);
            }
          );
      }
    } else {
      // Se `biblioData` è undefined, resetta le variabili.
      this.countElement = 0;
      this.bibliographyData = null;
    }
  }

  // Gestisce l'evento di digitazione con debounce, inviando i dati a un Subject per successive elaborazioni.
  debounceKeyup(evt, index, field) {
    this.lexicalService.spinnerAction('on'); // Attiva lo spinner per indicare l'inizio di un'operazione.
    this.subject.next({ evt, index, field }); // Invia i dati dell'evento, l'indice e il campo a un Subject.
  }

  // Gestisce le modifiche ai dati, aggiornando o inserendo elementi bibliografici in base al tipo di campo modificato.
  onChanges(data) {
    let fieldType = ''; // Inizializza la variabile per il tipo di campo.
    console.log(data); // Stampa i dati ricevuti per debug.
    if (data != undefined) {
      // Controlla se i dati non sono vuoti.
      let newValue = data.evt.target.value; // Estrae il nuovo valore dall'evento.
      let index = data?.index; // Estrae l'indice dall'oggetto dati.

      let oldValue = ''; // Inizializza la variabile per il vecchio valore.
      fieldType = data['field']; // Estrae il tipo di campo dall'oggetto dati.

      // Assegna il vecchio valore in base al tipo di campo.
      if (fieldType == 'http://www.w3.org/2004/02/skos/core#note') {
        oldValue = this.memoryNote[index];
      } else if (fieldType == 'http://www.w3.org/2000/01/rdf-schema#label') {
        oldValue = this.memoryTextualRef[index];
      }

      let instanceName = this.bibliographyData[index].bibliography; // Estrae il nome dell'istanza bibliografica.

      let parameters; // Inizializza la variabile per i parametri da inviare.

      // Assegna i parametri a seconda che il valore precedente sia vuoto o meno.
      if (oldValue == '') {
        parameters = {
          type: 'bibliography',
          relation: fieldType,
          value: newValue,
        };
      } else {
        parameters = {
          type: 'bibliography',
          relation: fieldType,
          value: newValue,
          currentValue: oldValue,
        };
      }

      console.log(this.biblioArray.at(index)); // Stampa l'elemento corrente dell'array per debug.
      console.log(parameters); // Stampa i parametri per debug.

      // Effettua una richiesta al servizio per aggiornare la relazione generica.
      this.lexicalService
        .updateGenericRelation(instanceName, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data); // Stampa i dati ricevuti per debug.
            this.lexicalService.spinnerAction('off'); // Disattiva lo spinner.
            this.lexicalService.updateCoreCard(this.object); // Aggiorna la scheda core.
            this.toastr.success('Bibliography item updated', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error); // Stampa l'errore per debug.
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off'); // Disattiva lo spinner.
            if (error.status == 200) {
              this.toastr.success('Bibliography item updated', '', {
                timeOut: 5000,
              });
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
          }
        );

      // Aggiorna i valori in memoria in base al tipo di campo.
      if (fieldType == 'http://www.w3.org/2004/02/skos/core#note') {
        this.memoryNote[index] = newValue;
      } else if (fieldType == 'http://www.w3.org/2000/01/rdf-schema#label') {
        this.memoryTextualRef[index] = newValue;
      }
    }
  }

  // Rimuove un elemento dalla bibliografia e aggiorna le strutture dati correlate.
  removeItem(index) {
    this.biblioArray = this.bibliographyForm.get('bibliography') as FormArray; // Ottiene l'array di elementi bibliografici.
    this.countElement--; // Decrementa il contatore degli elementi.

    let instanceName = this.bibliographyData[index].bibliography; // Estrae il nome dell'istanza bibliografica.

    // Effettua una richiesta al servizio per rimuovere l'elemento bibliografico.
    this.lexicalService
      .removeBibliographyItem(instanceName)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data); // Stampa i dati ricevuti per debug.
          this.lexicalService.updateCoreCard(this.object); // Aggiorna la scheda core.
          this.toastr.success('Element removed', '', {
            timeOut: 5000,
          });
        },
        (error) => {
          console.log(error); // Stampa l'errore per debug.
          this.lexicalService.updateCoreCard({ lastUpdate: error.error.text });
          if (error.status == 200) {
            this.toastr.success('Element removed', '', {
              timeOut: 5000,
            });
          } else {
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          }
        }
      );

    this.biblioArray.removeAt(index); // Rimuove l'elemento dall'array.
    this.bibliographyData.splice(index, 1); // Rimuove i dati dell'elemento dalle strutture dati.
    this.memoryNote.splice(index, 1); // Aggiorna la memoria delle note.
    this.memoryTextualRef.splice(index, 1); // Aggiorna la memoria dei riferimenti testuali.
  }

  // Aggiunge un elemento alla bibliografia, con la possibilità di specificare i dettagli.
  addBibliographyElement(i?, t?, a?, d?, n?, l?) {
    this.biblioArray = this.bibliographyForm.get('bibliography') as FormArray; // Ottiene l'array di elementi bibliografici.
    // Aggiunge un nuovo elemento bibliografico, vuoto o con i dettagli specificati.
    if (t == undefined) {
      this.biblioArray.push(this.createBibliography());
    } else {
      this.biblioArray.push(this.createBibliography(i, t, a, d, n, l));
    }
  }

  // Crea e restituisce un FormGroup per un elemento bibliografico, vuoto o con i dettagli specificati.
  createBibliography(i?, t?, a?, d?, n?, l?) {
    if (t == undefined) {
      return this.formBuilder.group({
        id: new FormControl(null),
        title: new FormControl(null),
        author: new FormControl(null),
        date: new FormControl(null),
        note: new FormControl(null),
        textualReference: new FormControl(null),
      });
    } else {
      return this.formBuilder.group({
        id: new FormControl(i),
        title: new FormControl(t),
        author: new FormControl(a),
        date: new FormControl(d),
        note: new FormControl(n),
        textualReference: new FormControl(l),
      });
    }
  }

  // Funzione per sincronizzare la bibliografia data un identificativo specifico e un indice
  synchronizeBibliography(id, i) {
    console.log(id);
    // Imposta l'indicatore di caricamento per la sincronizzazione all'indice specificato su true
    this.loadingSynchro[i] = true;

    let lexId = '';
    // Verifica la presenza di un'entrata lessicale senza forma e senso definiti
    if (
      this.object.lexicalEntry != undefined &&
      this.object.sense == undefined &&
      this.object.form == undefined
    ) {
      console.log(1);
      lexId = this.object.lexicalEntry;
      // Se è definita una forma, utilizzala come ID lessicale
    } else if (this.object.form != undefined) {
      lexId = this.object.form;
      console.log(2);
      // Se è definito un senso, utilizzalo come ID lessicale
    } else if (this.object.sense != undefined) {
      lexId = this.object.sense;
      console.log(3);
      // Se è definita un'etimologia, utilizzala come ID lessicale
    } else if (this.object.etymology != undefined) {
      lexId = this.object.etymology;
    }

    // Chiama il servizio lessicale per sincronizzare l'elemento della bibliografia
    this.lexicalService
      .synchronizeBibliographyItem(lexId, id)
      // Ritarda la notifica di nuovi valori dall'observable e gestisce la cancellazione della sottoscrizione
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // In caso di successo, logga i dati e imposta l'indicatore di caricamento su false
          console.log(data);
          this.loadingSynchro[i] = false;
        },
        (error) => {
          // In caso di errore, logga l'errore
          console.log(error);
          if (error.status == 200) {
            // Se lo stato dell'errore è 200, aggiorna la carta core e mostra un messaggio di successo
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.toastr.success('Item n°' + id + ' synchronized', '');
          }
          // Imposta l'indicatore di caricamento su false indipendentemente dall'esito
          this.loadingSynchro[i] = false;
        }
      );
  }

  // Funzione chiamata alla distruzione del componente per pulire le sottoscrizioni e segnalare la distruzione
  ngOnDestroy(): void {
    // Annulla la sottoscrizione dalle richieste di aggiunta bibliografiche e da altre sottoscrizioni
    this.add_biblio_req_subscription.unsubscribe();
    this.subject_subscription.unsubscribe();
    // Segnala la distruzione del componente per gestire eventuali osservabili in ascolto
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
