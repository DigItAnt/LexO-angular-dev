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
  Input,
  NgZone,
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
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { ModalComponent } from 'ng-modal-lib';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-etymology-tab',
  templateUrl: './etymology-tab.component.html',
  styleUrls: ['./etymology-tab.component.scss'],
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
export class EtymologyTabComponent implements OnInit, OnDestroy {
  lock = 0;
  object: any;
  exp_trig = '';

  isLexicalEntry = false;
  isForm = false;
  isSense = false;
  isLexicalConcept = false;
  searchIconSpinner = false;
  goBack = false;
  isEtymology = false;

  lastUpdateDate: any;
  creationDate: any;
  creator: any;
  revisor: any;

  lexicalEntryData: any;
  formData: any;
  senseData: any;
  lexicalConceptData: any;
  bibliography = [];

  start = 0;
  sortField = 'title';
  direction = 'asc';
  memorySort = { field: '', direction: '' };
  queryTitle = '';
  queryMode = 'titleCreatorYear';

  private searchSubject: Subject<any> = new Subject();
  selectedItem;

  @ViewChild('expander') expander_body: ElementRef;
  @Input() etymologyData: any;
  @ViewChild('addBibliography', { static: false }) modal: ModalComponent;
  @ViewChild('table_body') tableBody: ElementRef;

  etymology_data_subscription: Subscription;
  expand_edit_subscription: Subscription;
  expand_epigraphy_subscription: Subscription;
  spinner_subscription: Subscription;
  search_subject_subscription: Subscription;
  bootstrap_bibliography_subscription: Subscription;

  destroy$: Subject<boolean> = new Subject();
  constructor(
    private lexicalService: LexicalEntriesService,
    private biblioService: BibliographyService,
    private expand: ExpanderService,
    private rend: Renderer2,
    private toastr: ToastrService
  ) {}

  /**
   * Metodo di inizializzazione del componente. Viene eseguito quando il componente viene creato.
   */
  ngOnInit(): void {
    /**
     * Sottoscrizione all'observable etymologyData$ del servizio lexicalService.
     * Questo observable fornisce i dati relativi all'etimologia.
     */
    this.etymology_data_subscription =
      this.lexicalService.etymologyData$.subscribe((object) => {
        if (this.object != object) {
          // Se l'oggetto è diverso da quello ricevuto, reimposta le variabili di stato.
          this.etymologyData = null;
          this.isForm = false;
          this.isLexicalConcept = false;
          this.isLexicalEntry = false;
        }
        this.object = object;

        // Se l'oggetto non è nullo, aggiorna le variabili con i dati dell'etimologia.
        if (this.object != null) {
          this.creationDate = this.object.etymology.creationDate;
          this.lastUpdateDate = this.object.etymology.lastUpdate;
          this.creator = this.object['etymology'].creator;
          this.revisor = this.object.revisor;
          this.etymologyData = object;
          this.isEtymology = true;

          // Nasconde il modal dell'etimologia dopo un breve ritardo.
          setTimeout(() => {
            //@ts-ignore
            $('#etymologyTabModal').modal('hide');
            $('.modal-backdrop').remove();
            var timer = setInterval((val) => {
              try {
                //@ts-ignore
                $('#etymologyTabModal').modal('hide');
                if (!$('#etymologyTabModal').is(':visible')) {
                  clearInterval(timer);
                }
              } catch (e) {
                console.log(e);
              }
            }, 10);
          }, 500);
        }
      });

    /**
     * Sottoscrizione all'observable expEdit$ del servizio expand.
     * Questo observable controlla lo stato di espansione del tab di modifica.
     */
    this.expand_edit_subscription = this.expand.expEdit$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
            let isEditExpanded = this.expand.isEditTabExpanded();
            let isEpigraphyExpanded = this.expand.isEpigraphyTabExpanded();

            // Gestisce l'espansione del tab di modifica in base allo stato del tab epigrafico.
            if (!isEpigraphyExpanded) {
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
            return;
          } else {
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

    /**
     * Sottoscrizione all'observable expEpigraphy$ del servizio expand.
     * Questo observable controlla lo stato di espansione del tab epigrafico.
     */
    this.expand_epigraphy_subscription = this.expand.expEpigraphy$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
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
            return;
          } else {
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

    /**
     * Sottoscrizione all'observable updateCoreCardReq$ del servizio lexicalService.
     * Questo observable gestisce le richieste di aggiornamento della scheda di base.
     */
    this.lexicalService.updateCoreCardReq$.subscribe((data) => {
      console.log(data);
      if (data != null) {
        this.lastUpdateDate = data['lastUpdate'];
        if (data['creationDate'] != undefined) {
          this.creationDate = data['creationDate'];
        }
      }
    });

    /**
     * Sottoscrizione all'observable spinnerAction$ del servizio lexicalService.
     * Questo observable gestisce l'attivazione dello spinner di caricamento.
     */
    this.spinner_subscription = this.lexicalService.spinnerAction$.subscribe(
      (data) => {
        if (data == 'on') {
          this.searchIconSpinner = true;
        } else {
          this.searchIconSpinner = false;
        }
      },
      (error) => {
        // Gestione degli errori.
      }
    );

    /**
     * Sottoscrizione all'observable searchSubject.
     * Questo observable gestisce le ricerche nel soggetto.
     */
    this.search_subject_subscription = this.searchSubject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.queryTitle = data.query;
        data.queryMode
          ? (this.queryMode = 'everything')
          : (this.queryMode = 'titleCreatorYear');
        this.searchBibliography(this.queryTitle, this.queryMode);
      });

    // Mostra il modal della bibliografia etimologica.
    //@ts-ignore
    $('#biblioModalEtym').modal('show');
    $('.modal-backdrop').appendTo('.ui-modal');
    //@ts-ignore
    $('#biblioModalEtym').modal({ backdrop: 'static', keyboard: false });

    $('.modal-backdrop').css('height', 'inherit');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');

    /**
     * Sottoscrizione all'observable bootstrapData del servizio biblioService.
     * Questo observable fornisce i dati di base per la bibliografia.
     */
    this.bootstrap_bibliography_subscription = this.biblioService
      .bootstrapData(this.start, this.sortField, this.direction)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.memorySort = {
            field: this.sortField,
            direction: this.direction,
          };
          this.bibliography = data;
          this.bibliography.forEach((element) => {
            element['selected'] = false;
          });

          // Nasconde il modal della bibliografia dopo il caricamento dei dati.
          //@ts-ignore
          $('#biblioModalEtym').modal('hide');
          $('.modal-backdrop').remove();
        },
        (error) => {
          console.log(error);
        }
      );
  }

  /**
   * Funzione asincrona per eliminare un'etimologia.
   * Questa funzione invia una richiesta al servizio lessicale per eliminare l'etimologia specificata.
   * @returns null
   */
  async deleteEtymology() {
    this.searchIconSpinner = true; // Imposta lo spinner di ricerca su true per visualizzare un'icona di caricamento

    let etymId = this.object.etymology.etymology; // Ottiene l'ID dell'etimologia da eliminare

    try {
      // Effettua una richiesta di eliminazione dell'etimologia al servizio lessicale
      let delete_etym_req = await this.lexicalService
        .deleteEtymology(etymId)
        .toPromise();

      this.searchIconSpinner = false; // Imposta lo spinner di ricerca su false per rimuovere l'icona di caricamento
      this.lexicalService.deleteRequest(this.object); // Rimuove la richiesta corrente dal servizio lessicale
      this.lexicalEntryData = null; // Resetta i dati dell'ingresso lessicale
      this.isLexicalEntry = false; // Imposta la variabile isLexicalEntry su false per indicare che non c'è un ingresso lessicale attivo
      this.object = null; // Resetta l'oggetto corrente
      this.lexicalService.refreshLangTable(); // Aggiorna la tabella delle lingue nel servizio lessicale
      this.lexicalService.refreshFilter({ request: true }); // Aggiorna i filtri nel servizio lessicale
      this.lexicalService.sendToCoreTab(null); // Invia null alla scheda principale nel servizio lessicale
      this.lexicalService.sendToRightTab(null); // Invia null alla scheda destra nel servizio lessicale
      this.biblioService.sendDataToBibliographyPanel(null); // Invia null al pannello della bibliografia nel servizio bibliografico
      // Visualizza un messaggio di successo utilizzando Toastr per confermare l'eliminazione dell'etimologia
      this.toastr.success(etymId + ' eliminato correttamente', '', {
        timeOut: 5000,
      });
    } catch (error) {
      console.log(error); // Registra eventuali errori sulla console
      if (error.status == 200) {
        // Se lo stato dell'errore è 200 (OK)
        this.searchIconSpinner = false; // Imposta lo spinner di ricerca su false per rimuovere l'icona di caricamento
        this.lexicalService.deleteRequest(this.object); // Rimuove la richiesta corrente dal servizio lessicale
        this.lexicalEntryData = null; // Resetta i dati dell'ingresso lessicale
        this.isLexicalEntry = false; // Imposta la variabile isLexicalEntry su false per indicare che non c'è un ingresso lessicale attivo
        this.object = null; // Resetta l'oggetto corrente
        this.lexicalService.refreshLangTable(); // Aggiorna la tabella delle lingue nel servizio lessicale
        this.lexicalService.refreshFilter({ request: true }); // Aggiorna i filtri nel servizio lessicale
        this.lexicalService.sendToCoreTab(null); // Invia null alla scheda principale nel servizio lessicale
        this.lexicalService.sendToRightTab(null); // Invia null alla scheda destra nel servizio lessicale
        this.biblioService.sendDataToBibliographyPanel(null); // Invia null al pannello della bibliografia nel servizio bibliografico
        // Visualizza un messaggio di successo utilizzando Toastr per confermare l'eliminazione dell'etimologia
        this.toastr.success(etymId + ' eliminato correttamente', '', {
          timeOut: 5000,
        });
      } else {
        // Se lo stato dell'errore non è 200 (non è un successo)
        // Visualizza un messaggio di errore utilizzando Toastr con il messaggio di errore restituito
        this.toastr.success(error.error, '', {
          timeOut: 5000,
        });
      }
    }
  }

  /**
   * Funzione asincrona per aggiungere una nuova etimologia.
   * Questa funzione invia una richiesta al servizio lessicale per creare una nuova etimologia.
   * @returns null
   */
  async addNewEtymology() {
    this.searchIconSpinner = true; // Imposta lo spinner di ricerca su true per visualizzare un'icona di caricamento
    this.object['request'] = 'etymology'; // Imposta la richiesta nell'oggetto come "etimologia"

    let parentNodeInstanceName = this.object.parentNodeInstanceName; // Ottiene il nome dell'istanza del nodo padre
    this.object['lexicalEntry'] = parentNodeInstanceName; // Imposta l'ingresso lessicale nell'oggetto come il nome dell'istanza del nodo padre

    try {
      // Effettua una richiesta al servizio lessicale per creare una nuova etimologia
      let create_etymon_req = await this.lexicalService
        .createNewEtymology(parentNodeInstanceName)
        .toPromise();

      // Imposta l'etichetta della nuova etimologia includendo l'etichetta del nodo padre
      create_etymon_req['label'] =
        'Etimologia di: ' + this.object['parentNodeLabel'];

      // Controlla se l'utente corrente è l'autore della richiesta
      if (create_etymon_req['creator'] == this.object.creator) {
        create_etymon_req['flagAuthor'] = false; // Imposta il flagAuthor su false
      } else {
        create_etymon_req['flagAuthor'] = true; // Imposta il flagAuthor su true
      }

      // Aggiunge la richiesta di sottostante elemento al servizio lessicale
      this.lexicalService.addSubElementRequest({
        lex: this.object,
        data: create_etymon_req,
      });

      this.searchIconSpinner = false; // Imposta lo spinner di ricerca su false per rimuovere l'icona di caricamento

      // Visualizza un messaggio di successo utilizzando Toastr per confermare l'aggiunta dell'etimologia
      this.toastr.success(
        create_etymon_req['etymology'] + ' aggiunto correttamente',
        '',
        {
          timeOut: 5000,
        }
      );
    } catch (error) {
      console.log(error); // Registra eventuali errori sulla console
      this.searchIconSpinner = false; // Imposta lo spinner di ricerca su false per rimuovere l'icona di caricamento
    }
  }

  /**
   * Mostra il modale della bibliografia.
   * Questa funzione visualizza il modale della bibliografia.
   * @returns null
   */
  showBiblioModal() {
    this.modal.show(); // Visualizza il modale della bibliografia
  }

  /**
   * Verifica se l'elemento creatore esiste.
   * Questa funzione verifica se un elemento ha un creatore di tipo "author".
   * @param item - L'elemento da verificare.
   * @returns boolean - True se l'elemento ha un creatore di tipo "author", altrimenti False.
   */
  checkIfCreatorExist(item?) {
    return item.some((element) => element.creatorType === 'author'); // Verifica se esiste un creatore di tipo "author" nell'elemento
  }

  /**
   * Funzione asincrona per cercare nella bibliografia.
   * Questa funzione effettua una ricerca nella bibliografia utilizzando il testo di query fornito.
   * @param query - Il testo di query per la ricerca nella bibliografia.
   * @param queryMode - La modalità di query per la ricerca nella bibliografia.
   * @returns null
   */
  async searchBibliography(query?: string, queryMode?: any) {
    this.start = 0; // Resetta il valore di start per la paginazione a 0
    this.selectedItem = null; // Resetta l'elemento selezionato

    // Mostra il modale della bibliografia
    //@ts-ignore
    $('#biblioModalEtym').modal('show');
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalEtym').modal({ backdrop: 'static', keyboard: false });
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    console.log(query, queryMode);

    this.tableBody.nativeElement.scrollTop = 0; // Posiziona lo scroll della tabella della bibliografia all'inizio

    if (this.queryTitle != '') {
      // Se il titolo della query non è vuoto
      try {
        // Effettua una richiesta al servizio bibliografico per filtrare la bibliografia
        let filter_bibliography_req = await this.biblioService
          .filterBibliography(
            this.start,
            this.sortField,
            this.direction,
            this.queryTitle,
            this.queryMode
          )
          .toPromise();
        console.log(filter_bibliography_req);

        this.bibliography = []; // Resetta l'array della bibliografia

        // Aggiunge gli elementi filtrati dall'array restituito al array della bibliografia
        filter_bibliography_req.forEach((element) => {
          this.bibliography.push(element);
        });

        setTimeout(() => {
          //@ts-ignore
          $('#biblioModalEtym').modal('hide'); // Nasconde il modale della bibliografia
          $('.modal-backdrop').remove(); // Rimuove lo sfondo del modale
        }, 100);
      } catch (error) {
        console.log(error); // Registra eventuali errori sulla console
      }
    } else {
      // Se il titolo della query è vuoto
      try {
        // Effettua una richiesta al servizio bibliografico per filtrare la bibliografia
        let filter_bibliography_req = await this.biblioService
          .filterBibliography(
            this.start,
            this.sortField,
            this.direction,
            this.queryTitle,
            this.queryMode
          )
          .toPromise();
        console.log(filter_bibliography_req);

        this.bibliography = []; // Resetta l'array della bibliografia

        // Aggiunge gli elementi filtrati dall'array restituito al array della bibliografia
        filter_bibliography_req.forEach((element) => {
          this.bibliography.push(element);
        });
        //@ts-ignore
        $('#biblioModalEtym').modal('hide'); // Nasconde il modale della bibliografia
        $('.modal-backdrop').remove(); // Rimuove lo sfondo del modale
      } catch (error) {
        console.log(error); // Registra eventuali errori sulla console
      }
    }
  }

  /**
   * Attiva la ricerca quando viene premuto un tasto.
   * Questa funzione attiva la ricerca quando viene premuto un tasto sulla tastiera.
   * @param evt - L'evento di tastiera.
   * @param query - Il testo di query per la ricerca.
   * @param queryMode - La modalità di query per la ricerca.
   * @returns null
   */
  triggerSearch(evt, query, queryMode) {
    if (evt.key != 'Control' && evt.key != 'Shift' && evt.key != 'Alt') {
      this.searchSubject.next({ query, queryMode }); // Attiva la ricerca con la query e la modalità specificate
    }
  }

  /**
   * Funzione asincrona per gestire lo scroll verso il basso.
   * Questa funzione gestisce lo scroll verso il basso nella finestra della bibliografia.
   * @returns null
   */
  async onScrollDown() {
    //@ts-ignore
    $('#biblioModalEtym').modal('show'); // Mostra il modale della bibliografia
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalEtym').modal({ backdrop: 'static', keyboard: false });
    $('.modal-backdrop').appendTo('.table-body');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');

    this.start += 25; // Incrementa il valore di start per la paginazione

    if (this.queryTitle != '') {
      // Se il titolo della query non è vuoto
      try {
        // Effettua una richiesta al servizio bibliografico per filtrare la bibliografia
        let filter_bibliography_req = await this.biblioService
          .filterBibliography(
            this.start,
            this.sortField,
            this.direction,
            this.queryTitle,
            this.queryMode
          )
          .toPromise();
        console.log(filter_bibliography_req);
        //@ts-ignore
        $('#biblioModalEtym').modal('hide'); // Nasconde il modale della bibliografia
        $('.modal-backdrop').remove(); // Rimuove lo sfondo del modale

        // Aggiunge gli elementi filtrati dall'array restituito al array della bibliografia
        filter_bibliography_req.forEach((element) => {
          this.bibliography.push(element);
        });
      } catch (error) {
        console.log(error); // Registra eventuali errori sulla console
      }
    } else {
      // Se il titolo della query è vuoto
      try {
        // Effettua una richiesta al servizio bibliografico per filtrare la bibliografia
        let filter_bibliography_req = await this.biblioService
          .filterBibliography(
            this.start,
            this.sortField,
            this.direction,
            this.queryTitle,
            this.queryMode
          )
          .toPromise();

        // Aggiunge gli elementi filtrati dall'array restituito al array della bibliografia
        filter_bibliography_req.forEach((element) => {
          this.bibliography.push(element);
        });
        //@ts-ignore
        $('#biblioModalEtym').modal('hide'); // Nasconde il modale della bibliografia
        $('.modal-backdrop').remove(); // Rimuove lo sfondo del modale
      } catch (error) {
        console.log(error); // Registra eventuali errori sulla console
      }
    }
  }

  /**
   * Funzione per selezionare un elemento della bibliografia.
   * @param evt - L'evento scatenante.
   * @param i - L'indice dell'elemento selezionato.
   */
  selectItem(evt, i) {
    if (evt.shiftKey) {
      // Da implementare se necessario.
    }
    // Itera su ogni elemento della bibliografia.
    this.bibliography.forEach((element) => {
      if (element.key == i.key) {
        // Se l'elemento è stato selezionato, imposta selectedItem e ritorna true.
        element.selected = !element.selected;
        element.selected
          ? (this.selectedItem = element)
          : (this.selectedItem = null);
        return true;
      } else {
        // Se l'elemento non corrisponde, lo deseleziona e ritorna false.
        element.selected = false;
        return false;
      }
    });
  }

  /**
   * Funzione asincrona per ordinare la bibliografia.
   * @param evt - L'evento scatenante (opzionale).
   * @param val - Il valore del campo di ordinamento (opzionale).
   */
  async sortBibliography(evt?, val?) {
    // Gestisce la direzione di ordinamento.
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

    // Visualizza il modal della bibliografia.
    //@ts-ignore
    $('#biblioModalEtym').modal('show');
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalEtym').modal({ backdrop: 'static', keyboard: false });
    $('.modal-backdrop').appendTo('.table-body');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    // Reimposta lo scroll e il punto di partenza della visualizzazione della tabella.
    this.start = 0;
    this.tableBody.nativeElement.scrollTop = 0;

    try {
      // Filtra la bibliografia in base ai parametri.
      let filter_bibliography_req = await this.biblioService
        .filterBibliography(
          this.start,
          this.sortField,
          this.direction,
          this.queryTitle,
          this.queryMode
        )
        .toPromise();
      // Aggiunge gli elementi filtrati alla bibliografia.
      filter_bibliography_req.forEach((element) => {
        this.bibliography.push(element);
      });

      // Chiude il modal della bibliografia.
      //@ts-ignore
      $('#biblioModalEtym').modal('hide');
      $('.modal-backdrop').remove();
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Funzione asincrona per aggiungere un nuovo elemento di tipo "form".
   */
  async addNewForm() {
    this.searchIconSpinner = true;
    this.object['request'] = 'form';

    let parentNodeInstanceName = this.object.parentNodeInstanceName;
    this.object['lexicalEntry'] = parentNodeInstanceName;

    try {
      // Crea una nuova forma all'interno di un nodo specifico.
      let create_new_form_req = await this.lexicalService
        .createNewForm(parentNodeInstanceName)
        .toPromise();
      // Imposta flagAuthor in base al creatore della forma.
      if (create_new_form_req['creator'] == this.object.creator) {
        create_new_form_req['flagAuthor'] = false;
      } else {
        create_new_form_req['flagAuthor'] = true;
      }
      // Aggiunge la richiesta di sottorelemento.
      this.lexicalService.addSubElementRequest({
        lex: this.object,
        data: create_new_form_req,
      });
      this.searchIconSpinner = false;
      // Visualizza un messaggio di successo.
      this.toastr.success(
        create_new_form_req['form'] + ' added correctly',
        '',
        {
          timeOut: 5000,
        }
      );
    } catch (error) {
      console.log(error);
      if (error.status != 200) {
        this.searchIconSpinner = false;
        this.toastr.error('Something goes wrong', 'Error', {
          timeOut: 5000,
        });
      }
    }
  }

  /**
   * Funzione asincrona per aggiungere un nuovo elemento di tipo "sense".
   */
  async addNewSense() {
    this.searchIconSpinner = true;
    this.object['request'] = 'sense';

    let parentNodeInstanceName = this.object.parentNodeInstanceName;
    this.object['lexicalEntry'] = parentNodeInstanceName;
    this.object['request'] = 'sense';

    try {
      // Crea un nuovo senso all'interno di un nodo specifico.
      let create_new_sense = await this.lexicalService
        .createNewSense(parentNodeInstanceName)
        .toPromise();
      // Imposta flagAuthor in base al creatore del senso.
      if (create_new_sense['creator'] == this.object.creator) {
        create_new_sense['flagAuthor'] = false;
      } else {
        create_new_sense['flagAuthor'] = true;
      }
      // Aggiunge la richiesta di sottorelemento.
      this.lexicalService.addSubElementRequest({
        lex: this.object,
        data: create_new_sense,
      });
      this.searchIconSpinner = false;
      // Visualizza un messaggio di successo.
      this.toastr.success(create_new_sense['sense'] + ' added correctly', '', {
        timeOut: 5000,
      });
    } catch (error) {
      console.log(error);
      if (error.status != 200) {
        this.searchIconSpinner = false;
        this.toastr.error(error.error, 'Error', {
          timeOut: 5000,
        });
      }
    }
  }

  /**
   * Funzione asincrona per aggiungere un nuovo elemento alla bibliografia.
   * @param item - L'elemento da aggiungere (opzionale).
   */
  async addBibliographyItem(item?) {
    //@ts-ignore
    $('#biblioModalEtym').modal('show');
    $('.modal-backdrop').appendTo('.ui-modal');
    //@ts-ignore
    $('#biblioModalEtym').modal({ backdrop: 'static', keyboard: false });

    $('.modal-backdrop').css('height', 'inherit');
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');

    let instance = this.object.etymology.etymology;

    if (item != undefined) {
      // Estrapola i dati necessari dall'oggetto item.
      let id = item.data.key != undefined ? item.data.key : '';
      let title = item.data.title != undefined ? item.data.title : '';
      let author;

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

      let parameters = {
        id: id,
        title: title,
        author: author,
        date: date,
        url: url,
        seeAlsoLink: seeAlsoLink,
      };

      try {
        // Aggiunge i dati bibliografici all'etimologia corrente.
        let add_biblio_data = await this.lexicalService
          .addBibliographyData(instance, parameters)
          .toPromise();
        // Chiude il modal e visualizza un messaggio di successo.
        setTimeout(() => {
          //@ts-ignore
          $('#biblioModalEtym').modal('hide');
          $('.modal-backdrop').remove();
          this.toastr.success('Item added, check bibliography panel', '', {
            timeOut: 5000,
          });
          // Aggiorna il pannello della bibliografia.
          this.biblioService.triggerPanel(add_biblio_data);
          setTimeout(() => {
            this.modal.hide();
          }, 10);
        }, 300);
        this.biblioService.sendDataToBibliographyPanel(add_biblio_data);
      } catch (error) {
        if (error.status != 200) {
          console.log(error);
          // Visualizza un messaggio di errore in caso di fallimento.
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
          setTimeout(() => {
            //@ts-ignore
            $('#biblioModalEtym').modal('hide');
            $('.modal-backdrop').remove();
          }, 300);
        }
      }
    }
  }

  /**
   * Funzione chiamata alla chiusura del modal.
   */
  onCloseModal() {
    // Reimposta i valori e ricarica i dati della bibliografia.
    this.selectedItem = null;
    this.start = 0;
    this.sortField = 'title';
    this.direction = 'asc';
    this.tableBody.nativeElement.scrollTop = 0;
    this.memorySort = { field: this.sortField, direction: this.direction };
    // Carica nuovamente i dati della bibliografia.
    this.biblioService
      .bootstrapData(this.start, this.sortField, this.direction)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.bibliography = data;
          // Imposta selected a false per ogni elemento della bibliografia.
          this.bibliography.forEach((element) => {
            element['selected'] = false;
          });
        },
        (error) => {
          console.log(error);
        }
      );
  }

  /**
   * Metodo chiamato quando il componente viene distrutto.
   */
  ngOnDestroy(): void {
    // Annulla le sottoscrizioni per evitare memory leak.
    this.etymology_data_subscription.unsubscribe();
    this.expand_edit_subscription.unsubscribe();
    this.expand_epigraphy_subscription.unsubscribe();
    this.spinner_subscription.unsubscribe();
    this.search_subject_subscription.unsubscribe();
    this.bootstrap_bibliography_subscription.unsubscribe();
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
