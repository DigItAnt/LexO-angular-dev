/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, take, takeUntil } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-language-manager',
  templateUrl: './language-manager.component.html',
  styleUrls: ['./language-manager.component.scss'],
})
export class LanguageManagerComponent implements OnInit, OnDestroy {
  languageList = [];
  editLangArray = [];
  isValid = false;
  loadingService = false;
  removeMessage;
  destroy$: Subject<boolean> = new Subject();
  linkedLexicalEntries: string;

  private subject: Subject<any> = new Subject();

  editLangForm = new FormGroup({
    description: new FormControl(''),
    lexvo: new FormControl('', [Validators.required, Validators.minLength(3)]),
    label: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(3),
    ]),
  });

  refresh_lang_table_subscription: Subscription;
  subject_subscription: Subscription;

  constructor(
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Sottoscrizione per aggiornare la tabella delle lingue quando si verifica un evento di aggiornamento
    this.refresh_lang_table_subscription =
      this.lexicalService.refreshLangTable$.subscribe(
        (data) => {
          this.loadLangData(); // Carica i dati delle lingue
        },
        (error) => {
          // Gestione degli errori non implementata
        }
      );

    // Sottoscrizione a un soggetto per l'editazione della lingua, con debounce di 3 secondi
    this.subject_subscription = this.subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onEditLanguage(data); // Funzione chiamata per modificare i dati di una lingua
      });
  }

  loadLangData() {
    // Richiede l'elenco delle lingue disponibili e le assegna alla variabile languageList
    this.lexicalService
      .getLexiconLanguages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.languageList = data; // Assegnazione dell'elenco delle lingue
        },
        (error) => {
          // Gestione degli errori non implementata
        }
      );
  }

  onSubmit(inputValue: string) {
    // Valida l'input come codice di lingua di 2 o 3 lettere
    if (inputValue.match(/^[A-Za-z]{2,3}$/)) {
      this.isValid = true;
      this.loadingService = true;

      // Crea una nuova lingua utilizzando l'input fornito
      this.lexicalService
        .createNewLanguage(inputValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.loadingService = false;
            // Segnala agli altri componenti che l'elenco delle lingue, il filtro e la selezione sono stati aggiornati
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateLangSelect({ request: true });
            this.lexicalService.refreshLangTable();
            // Notifica la creazione della lingua
            this.toastr.info('Language ' + data['label'] + ' created', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            this.loadingService = false;
            // Segnala un aggiornamento necessario a causa di un errore
            this.lexicalService.refreshLangTable();
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateLangSelect({ request: true });
          }
        );
    } else {
      this.isValid = false;
    }
  }

  triggerEdit(i, v) {
    // Emette un nuovo valore per l'oggetto di editazione
    this.subject.next({ i, v });
  }

  onEditLanguage(data) {
    // Verifica che il valore da modificare non sia vuoto
    if (data['v'].trim() != '') {
      // Controlla il tipo di dato da modificare e esegue l'azione corrispondente
      if (data['i'] == 'description') {
        let langId = this.editLangArray['language'];
        let parameters = {
          relation: 'http://purl.org/dc/terms/description',
          value: data['v'],
        };

        // Aggiorna la descrizione della lingua e gestisce la risposta
        this.lexicalService
          .updateLanguage(langId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              // Notifica l'aggiornamento agli altri componenti
              this.lexicalService.refreshLangTable();
              this.lexicalService.refreshFilter({ request: true });
            },
            (error) => {
              console.log(error);
              // Gestisce gli errori dell'aggiornamento
              this.lexicalService.refreshLangTable();
              this.lexicalService.refreshFilter({ request: true });
              if (error.status == 200) {
                this.toastr.info('Description for ' + langId + ' updated', '', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
      } else if (data['i'] == 'lexvo') {
        // Analogamente per gli altri campi, "lexvo" e "label"
        let langId = this.editLangArray['language'];
        let parameters = {
          relation: 'http://purl.org/dc/terms/language',
          value: data['v'],
        };

        this.lexicalService
          .updateLanguage(langId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.lexicalService.refreshLangTable();
              this.lexicalService.refreshFilter({ request: true });
            },
            (error) => {
              console.log(error);
              this.lexicalService.refreshLangTable();
              this.lexicalService.refreshFilter({ request: true });
              if (error.status == 200) {
                this.toastr.info('Description for ' + langId + ' updated', '', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
      }
      // Il caso "label" segue una logica simile agli altri, con una validazione aggiuntiva
    } else {
      // Notifica l'errore di inserimento di un valore vuoto
      this.toastr.error("Don't insert empty value", 'Error', {
        timeOut: 5000,
      });
    }
  }

  // Modifica i dettagli della lingua selezionata
  editLang(index) {
    // Imposta l'elemento selezionato dalla lista delle lingue come oggetto corrente da modificare
    this.editLangArray = this.languageList[index];
    // Imposta il valore del campo 'description' nel form di modifica con il valore corrispondente dell'oggetto selezionato
    this.editLangForm
      .get('description')
      .setValue(this.editLangArray['description'], { eventEmit: false });
    // Imposta il valore del campo 'lexvo' nel form di modifica con il valore corrispondente dell'oggetto selezionato
    this.editLangForm
      .get('lexvo')
      .setValue(this.editLangArray['lexvo'], { eventEmit: false });
    // Imposta il valore del campo 'label' nel form di modifica con il valore corrispondente dell'oggetto selezionato
    this.editLangForm
      .get('label')
      .setValue(this.editLangArray['label'], { eventEmit: false });
  }

  // Verifica se il campo specificato nel form di modifica è valido
  checkEditValid(index) {
    // Restituisce la validità del campo specificato
    return this.editLangForm.get(index).valid;
  }

  // Rimuove una lingua dalla lista
  removeLang(index) {
    // Imposta il messaggio di rimozione con il nome della lingua selezionata
    this.removeMessage = this.languageList[index]['language'];
  }

  // Visualizza le voci lessicali collegate alla lingua selezionata
  async showLinkedLexicalEntries(index) {
    // Reset della stringa contenente le voci lessicali collegate
    this.linkedLexicalEntries = '';
    console.log(this.languageList[index]);
    // Determina il valore di lexvo o label da utilizzare per la ricerca delle voci lessicali collegate
    let lexvo =
      this.languageList[index].lexvo != ''
        ? this.languageList[index].lexvo
        : this.languageList[index].label;

    // Parametri per la richiesta delle voci lessicali
    let parameters = {
      text: '',
      searchMode: 'startsWith',
      type: '',
      pos: '',
      formType: 'entry',
      author: '',
      lang: lexvo,
      status: '',
      offset: 0,
      limit: 500,
    };

    // Effettua la richiesta asincrona per ottenere le voci lessicali filtrate
    let filtered_lex_entries = await this.lexicalService
      .getLexicalEntriesList(parameters)
      .toPromise();

    // Aggiunge ogni voce lessicale trovata alla stringa delle voci collegate
    filtered_lex_entries.list.forEach((element) => {
      this.linkedLexicalEntries += element.lexicalEntry + '\n';
    });

    // Visualizza le voci lessicali collegate nell'elemento HTML specificato
    document.getElementById('lexical-entries-linked-list').innerHTML =
      this.linkedLexicalEntries;
  }

  // Gestisce la richiesta di eliminazione di una lingua
  deleteLangRequest() {
    // Ottiene l'ID della lingua da rimuovere
    let langId = this.removeMessage;
    // Esegue la richiesta di eliminazione
    this.lexicalService
      .deleteLanguage(langId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Log della risposta e aggiornamento delle tabelle correlate
          console.log(data);
          this.lexicalService.refreshLangTable();
          this.lexicalService.refreshFilter({ request: true });
          // Notifica l'utente del successo dell'operazione
          this.toastr.info('Language ' + langId + ' removed', '', {
            timeOut: 5000,
          });
        },
        (error) => {
          // Log dell'errore e aggiornamento delle tabelle correlate
          console.log(error);
          this.lexicalService.refreshLangTable();
          this.lexicalService.refreshFilter({ request: true });
          // Notifica l'utente dell'errore
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      );
  }

  // Gestisce la distruzione del componente
  ngOnDestroy(): void {
    // Disiscrive gli abbonamenti per evitare perdite di memoria
    this.refresh_lang_table_subscription.unsubscribe();
    this.subject_subscription.unsubscribe();

    // Segnala la distruzione del componente e completa l'observable
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
