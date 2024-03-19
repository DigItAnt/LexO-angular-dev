/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { LexicalEntriesService } from '../../../../../services/lexical-entries/lexical-entries.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';

import {
  animate,
  style,
  transition,
  trigger,
  state,
} from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-decomposition-tab',
  templateUrl: './decomposition-tab.component.html',
  styleUrls: ['./decomposition-tab.component.scss'],
  animations: [
    trigger('slideInOut', [
      state(
        'in',
        style({
          height: 'calc(100vh - 17rem)',
        })
      ),
      state(
        'out',
        style({
          height: 'calc(50vh - 12.5rem)',
        })
      ),
      transition('in => out', animate('400ms ease-in-out')),
      transition('out => in', animate('400ms ease-in-out')),
    ]),
  ],
})
export class DecompositionTabComponent implements OnInit, OnDestroy {
  lock = 0;
  object: any;
  exp_trig = '';

  creationDate;
  lastUpdate;

  isLexicalEntry = false;
  searchIconSpinner = false;

  decompData: any;
  destroy$: Subject<boolean> = new Subject();
  core_data_subscription: Subscription;
  decomp_data_subscription: Subscription;
  expand_edit_subscription: Subscription;
  expand_epigraphy_subscription: Subscription;

  @ViewChild('expander') expander_body: ElementRef;

  constructor(
    private toastr: ToastrService,
    private lexicalService: LexicalEntriesService,
    private expand: ExpanderService,
    private rend: Renderer2
  ) {}

  /**
   * Inizializza il componente e sottoscrive il servizio `lexicalService.decompData$` per ricevere gli aggiornamenti dei dati.
   * Gestisce la visualizzazione dei dati lexical e delle relative azioni.
   */
  ngOnInit(): void {
    // Sottoscrizione al servizio per ricevere gli aggiornamenti dei dati lexical
    this.decomp_data_subscription = this.lexicalService.decompData$.subscribe(
      (object) => {
        // Resetta gli oggetti locali a null
        this.object = null;
        // Se l'oggetto ricevuto è diverso da quello attualmente gestito
        if (this.object != object) {
          // Resetta i dati lexical a null
          this.decompData = null;
        }
        // Assegna l'oggetto ricevuto all'oggetto locale
        this.object = object;

        // Verifica se l'oggetto ricevuto è valido
        if (this.object != null) {
          // Se l'oggetto contiene una voce lessicale ma non un sensum
          if (
            this.object.lexicalEntry != undefined &&
            this.object.sense == undefined
          ) {
            // Imposta il flag per indicare che si tratta di una voce lessicale
            this.isLexicalEntry = true;
            // Assegna i dati lexical ricevuti
            this.decompData = object;

            // Assegna le date di creazione e ultimo aggiornamento
            this.creationDate = object['creationDate'];
            this.lastUpdate = object['lastUpdate'];
          } else if (this.object.form != undefined) {
            // Se l'oggetto contiene una forma ma non una voce lessicale
            // Imposta il flag per indicare che non si tratta di una voce lessicale
            this.isLexicalEntry = false;
            // Resetta i dati lexical e l'oggetto
            this.decompData = null;
            this.object = null;
          } else if (this.object.sense != undefined) {
            // Se l'oggetto contiene un sensum
            // Imposta il flag per indicare che non si tratta di una voce lessicale
            this.isLexicalEntry = false;
            // Resetta i dati lexical e l'oggetto
            this.decompData = null;
            this.object = null;
          }
        }
      }
    );

    // Sottoscrizione al servizio per ricevere gli aggiornamenti dello stato di espansione dell'editor
    this.expand_edit_subscription = this.expand.expEdit$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
            // Verifica lo stato di espansione dell'editor e dell'epigrafia
            let isEditExpanded = this.expand.isEditTabExpanded();
            let isEpigraphyExpanded = this.expand.isEpigraphyTabExpanded();

            if (!isEpigraphyExpanded) {
              // Se l'epigrafia non è espansa, espande l'editor
              this.exp_trig = 'in';
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'height',
                'calc(100vh - 17rem)'
              );
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'max-height',
                'calc(100vh - 17rem)'
              );
            } else {
              // Altrimenti, riduce l'editor alla metà della pagina
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'height',
                'calc(50vh - 12.5rem)'
              );
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'max-height',
                'calc(50vh - 12.5rem)'
              );
              this.exp_trig = 'in';
            }
          } else if (trigger == null) {
            // Se il trigger è null, non fa nulla
            return;
          } else {
            // Altrimenti, riduce l'editor alla metà della pagina
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'height',
              'calc(50vh - 12.5rem)'
            );
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'max-height',
              'calc(50vh - 12.5rem)'
            );
            this.exp_trig = 'out';
          }
        }, 100);
      }
    );

    // Sottoscrizione al servizio per ricevere gli aggiornamenti dello stato di espansione dell'epigrafia
    this.expand_epigraphy_subscription = this.expand.expEpigraphy$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
            // Se è richiesta l'espansione dell'epigrafia, la espande
            this.exp_trig = 'in';
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'height',
              'calc(50vh - 12.5rem)'
            );
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'max-height',
              'calc(50vh - 12.5rem)'
            );
          } else if (trigger == null) {
            // Se il trigger è null, non fa nulla
            return;
          } else {
            // Altrimenti, riduce l'epigrafia alla metà della pagina
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'max-height',
              'calc(50vh - 12.5rem)'
            );
            this.exp_trig = 'out';
          }
        }, 100);
      }
    );
  }

  /**
   * Aggiunge una nuova forma lessicale.
   * Nota: La funzione assegna una richiesta 'form' all'oggetto corrente e comunica con il servizio `lexicalService` per aggiungere la nuova forma.
   */
  addNewForm() {
    // Visualizza l'icona di caricamento
    this.searchIconSpinner = true;
    // Imposta la richiesta come 'form' all'oggetto corrente
    this.object['request'] = 'form';
    // Verifica se l'oggetto corrente è una voce lessicale
    if (this.isLexicalEntry) {
      // Se è una voce lessicale, ottiene l'ID lessicale
      let lexicalId = this.object.lexicalEntry;
      // Chiama il servizio per creare una nuova forma passando l'ID lessicale
      this.lexicalService
        .createNewForm(lexicalId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Se la forma è stata aggiunta correttamente
            this.toastr.success('Form added correctly', '', {
              timeOut: 5000,
            });
            // Se il creatore della forma è lo stesso dell'oggetto corrente, imposta il flag dell'autore a false
            if (data['creator'] == this.object.creator) {
              data['flagAuthor'] = false;
            } else {
              data['flagAuthor'] = true;
            }
            // Comunica con il servizio per aggiungere la richiesta di sottostante
            this.lexicalService.addSubElementRequest({
              lex: this.object,
              data: data,
            });
            // Nasconde l'icona di caricamento
            this.searchIconSpinner = false;
          },
          (error) => {
            // Se si verifica un errore durante l'aggiunta della forma
            console.log(error);
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
            // Nasconde l'icona di caricamento
            this.searchIconSpinner = false;
          }
        );
    }
  }

  /**
   * Aggiunge un nuovo sensum.
   * Nota: La funzione assegna una richiesta 'sense' all'oggetto corrente e comunica con il servizio `lexicalService` per aggiungere il nuovo sensum.
   */
  addNewSense() {
    // Visualizza l'icona di caricamento
    this.searchIconSpinner = true;
    // Imposta la richiesta come 'sense' all'oggetto corrente
    this.object['request'] = 'sense';
    // Verifica se l'oggetto corrente è una voce lessicale
    if (this.isLexicalEntry) {
      // Se è una voce lessicale, ottiene l'ID lessicale
      let lexicalId = this.object.lexicalEntry;
      // Chiama il servizio per creare un nuovo sensum passando l'ID lessicale
      this.lexicalService
        .createNewSense(lexicalId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Se il sensum è stato aggiunto correttamente
            if (data['creator'] == this.object.creator) {
              data['flagAuthor'] = false;
            } else {
              data['flagAuthor'] = true;
            }
            // Comunica con il servizio per aggiungere la richiesta di sottostante
            this.lexicalService.addSubElementRequest({
              lex: this.object,
              data: data,
            });
            // Nasconde l'icona di caricamento
            this.searchIconSpinner = false;
            this.toastr.success('Sense added correctly', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            // Se si verifica un errore durante l'aggiunta del sensum
            this.searchIconSpinner = false;
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          }
        );
    }
  }

  /**
   * Aggiunge una nuova etimologia.
   * Nota: La funzione assegna una richiesta 'etymology' all'oggetto corrente e comunica con il servizio `lexicalService` per aggiungere la nuova etimologia.
   */
  addNewEtymology() {
    // Visualizza l'icona di caricamento
    this.searchIconSpinner = true;
    // Imposta la richiesta come 'etymology' all'oggetto corrente
    this.object['request'] = 'etymology';
    let parentNodeInstanceName = '';
    // Verifica se l'oggetto corrente ha una voce lessicale come genitore
    if (
      this.object.lexicalEntry != undefined &&
      this.object.senseInstanceName == undefined
    ) {
      parentNodeInstanceName = this.object.lexicalEntry;
    }
    // Chiama il servizio per creare una nuova etimologia passando il nome dell'istanza genitore
    this.lexicalService
      .createNewEtymology(parentNodeInstanceName)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Se l'etimologia è stata aggiunta correttamente
          if (data['creator'] == this.object.creator) {
            data['flagAuthor'] = false;
          } else {
            data['flagAuthor'] = true;
          }
          // Comunica con il servizio per aggiungere la richiesta di sottostante
          this.lexicalService.addSubElementRequest({
            lex: this.object,
            data: data,
          });
          // Nasconde l'icona di caricamento
          this.searchIconSpinner = false;
          this.toastr.success('Etymology added correctly', '', {
            timeOut: 5000,
          });
        },
        (error) => {
          // Se si verifica un errore durante l'aggiunta dell'etimologia
          this.searchIconSpinner = false;
        }
      );
  }

  /**
   * Distrugge il componente e annulla le sottoscrizioni ai servizi.
   */
  ngOnDestroy(): void {
    // Annulla la sottoscrizione allo stato di espansione dell'editor
    this.expand_edit_subscription.unsubscribe();
    // Annulla la sottoscrizione allo stato di espansione dell'epigrafia
    this.expand_epigraphy_subscription.unsubscribe();

    // Notifica la distruzione del componente
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
