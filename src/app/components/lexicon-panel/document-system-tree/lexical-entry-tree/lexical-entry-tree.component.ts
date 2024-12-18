/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  ApplicationRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {
  TreeNode,
  TreeModel,
  TREE_ACTIONS,
  KEYS,
  IActionMapping,
  ITreeOptions,
  ITreeState,
} from '@circlon/angular-tree-component';
import {
  formTypeEnum,
  LexicalEntryRequest,
  searchModeEnum,
  typeEnum,
} from './interfaces/lexical-entry-interface';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { FormControl, FormGroup } from '@angular/forms';
import { ContextMenuComponent } from 'ngx-contextmenu';

import * as _ from 'underscore';
declare var $: JQueryStatic;

import { debounceTime, take, takeUntil } from 'rxjs/operators';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { Subject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

// Definizione di actionMapping con mappatura delle azioni del mouse su un albero
const actionMapping: IActionMapping = {
  mouse: {
    // Gestione del doppio clic su un nodo
    dblClick: (tree, node, $event) => {
      // Se il nodo cliccato ha figli, alterna la sua espansione (espanso/collassato)
      if (node.hasChildren) {
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    },
    // Gestione del clic su un nodo
    click: (tree, node, $event) => {
      // Alterna lo stato attivo del nodo (attivo/non attivo)
      TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
      // Alterna l'espansione del nodo (espanso/collassato)
      TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
    },
    // Gestione del clic destro (menu contestuale) su un nodo
    contextMenu: (tree, node, $event) => {
      // Alterna lo stato attivo del nodo (attivo/non attivo)
      TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
      // Alterna l'espansione del nodo (espanso/collassato)
      TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
    },
  },
};

@Component({
  selector: 'app-lexical-entry-tree',
  templateUrl: './lexical-entry-tree.component.html',
  styleUrls: ['./lexical-entry-tree.component.scss'],
})
export class LexicalEntryTreeComponent implements OnInit, OnDestroy {
  state!: ITreeState;
  show = false;
  modalShow = false;
  flagAuthor = false;
  searchIconSpinner = false;
  viewPort: any;
  titlePopover = 'Search examples';
  popoverWildcards =
    '<span><b>Multiple character wildcard search:</b></span>&nbsp;<span><i>te*</i></span><br><span><b>Single character wildcard search:</b></span>&nbsp;<span><i>te?t</i></span><br> <b>Fuzzy search:</b></span>&nbsp;<span><i>test~</i></span><br><b>Weighted fuzzy search:</b></span>&nbsp;<span><i>test~0.8</i></span>';
  labelView = true;
  idView = false;
  offset = 0;
  limit = 500;
  interval;

  destroy$: Subject<boolean> = new Subject();

  // Riferimento al componente del menu contestuale, usato per interazioni specifiche dell'interfaccia utente.
  @ViewChild(ContextMenuComponent) public basicMenu: ContextMenuComponent;

  // Contatore utilizzato per tenere traccia di un valore numerico, ad esempio il numero di interazioni.
  counter = 0;

  // Input ricevuto da un componente padre, potrebbe essere utilizzato per attivare la visualizzazione di un albero di elementi.
  @Input() triggerShowTree: any;

  // Riferimento all'elemento dell'albero delle voci lessicali nell'interfaccia utente.
  @ViewChild('lexicalEntry') lexicalEntryTree: any;

  // Variabili non inizializzate, probabilmente utilizzate per immagazzinare dati dinamici nell'applicazione.
  nodes; // Nodi dell'albero, rappresentano le voci lessicali o strutture correlate.
  languages; // Lingue disponibili per le voci lessicali.
  types; // Tipi di voci lessicali, come definizioni, sinonimi, ecc.
  authors; // Autori delle voci lessicali.
  partOfSpeech; // Parti del discorso delle voci lessicali, come sostantivi, verbi, ecc.
  selectedNodeId; // ID del nodo selezionato nell'interfaccia utente.
  status = [
    { label: 'false', count: 0 },
    { label: 'true', count: 0 },
  ]; // Stati delle voci lessicali, con conteggio per ciascuno.

  // Parametri per la richiesta di ricerca di voci lessicali, con valori predefiniti per alcuni campi.
  parameters: LexicalEntryRequest = {
    text: '',
    searchMode: searchModeEnum.startsWith,
    type: '',
    pos: '',
    formType: 'entry',
    author: '',
    lang: '',
    status: '',
    offset: this.offset,
    limit: this.limit,
  };

  // Opzioni per la configurazione dell'albero delle voci lessicali, inclusi dettagli come lo scrolling virtuale e l'altezza dei nodi.
  options: ITreeOptions = {
    useVirtualScroll: true,
    scrollOnActivate: false,
    nodeHeight: 13,
    actionMapping,
    getChildren: this.getChildren.bind(this),
  };

  // Formulario per il filtro delle ricerche delle voci lessicali, con controlli e valori predefiniti.
  filterForm = new FormGroup({
    text: new FormControl(''),
    searchMode: new FormControl('startsWith'),
    type: new FormControl(''),
    pos: new FormControl(''),
    formType: new FormControl('entry'),
    author: new FormControl(''),
    lang: new FormControl(''),
    status: new FormControl(''),
  });

  initialValues = this.filterForm.value;

  copySubject: Subject<string> = new Subject();

  delete_req_subscription: Subscription;
  add_sub_subscription: Subscription;
  copy_subject_subscription: Subscription;
  refresh_filter_subscription: Subscription;
  get_lex_entry_list_subscription: Subscription;
  get_languages_subscription: Subscription;
  get_types_subscription: Subscription;
  get_authors_subscription: Subscription;
  get_pos_subscription: Subscription;
  get_status_subscription: Subscription;

  constructor(
    private expander: ExpanderService,
    private renderer: Renderer2,
    private element: ElementRef,
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService
  ) {
    // Definisce una variabile 'refreshTooltip' e assegna un intervallo che esegue una funzione ogni 2000 millisecondi (2 secondi)
    var refreshTooltip = setInterval((val) => {
      // Utilizza il metodo 'tooltip' di jQuery per disabilitare e poi abilitare i tooltip per elementi con classe 'lexical-tooltip'.
      // Questo è utile per rinfrescare i tooltip senza dover ricaricare la pagina o gli elementi specifici.
      //@ts-ignore
      $('.lexical-tooltip').tooltip('disable');
      //@ts-ignore
      $('.lexical-tooltip').tooltip('enable');

      // Utilizza il metodo 'tooltip' di jQuery per disabilitare e poi abilitare i tooltip per elementi con classe 'note-tooltip'.
      // Analogamente al caso precedente, serve a rinfrescare i tooltip per gli elementi specificati.
      //@ts-ignore
      $('.note-tooltip').tooltip('disable');
      //@ts-ignore
      $('.note-tooltip').tooltip('enable');
    }, 2000); // Il numero 2000 indica il tempo dell'intervallo in millisecondi.
  }

  ngOnInit(): void {
    // Imposta il viewport cercando nell'elemento DOM l'elemento 'tree-viewport' e aggiunge la classe 'search-results'
    this.viewPort = this.element.nativeElement.querySelector('tree-viewport');
    this.renderer.addClass(this.viewPort, 'search-results');

    // Chiama la funzione per gestire eventuali cambiamenti
    this.onChanges();

    // Sottoscrizione al servizio per la gestione delle richieste di cancellazione di voci lessicali
    this.delete_req_subscription = this.lexicalService.deleteReq$.subscribe(
      (signal) => {
        // Se il segnale ricevuto non è null, invoca la funzione per la cancellazione di una voce lessicale
        if (signal != null) {
          this.lexEntryDeleteReq(signal);
        }
      }
    );

    // Sottoscrizione al servizio per la gestione delle richieste di aggiunta di sottovoci
    this.add_sub_subscription = this.lexicalService.addSubReq$.subscribe(
      (signal) => {
        // Se il segnale ricevuto non è null, invoca la funzione per aggiungere un sottogruppo
        if (signal != null) {
          this.addSubElement(signal);
        }
      }
    );

    // Sottoscrizione per la gestione della copia di testo, con debounce per evitare ripetizioni rapide
    this.copy_subject_subscription = this.copySubject
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe((v) => {
        // Crea un elemento textarea temporaneo per copiare il testo
        let selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = v;
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);

        // Notifica l'utente che l'URI è stato copiato
        this.toastr.info('URI copied', 'Info', {
          timeOut: 5000,
        });
      });

    // Sottoscrizione al servizio per la gestione del filtro di refresh
    this.refresh_filter_subscription =
      this.lexicalService.refreshFilter$.subscribe((signal) => {
        // Se il segnale ricevuto non è null, esegue una serie di sottoscrizioni per aggiornare i dati visualizzati
        if (signal != null) {
          // Ottiene l'elenco delle voci lessicali
          this.get_lex_entry_list_subscription = this.lexicalService
            .getLexicalEntriesList(this.parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                this.counter = data['totalHits'];
              },
              (error) => {
                // Gestisce eventuali errori
              }
            );

          // Ottiene l'elenco delle lingue disponibili
          this.get_languages_subscription = this.lexicalService
            .getLanguages()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
              this.languages = data;
            });

          // Ottiene l'elenco dei tipi di voci lessicali
          this.get_types_subscription = this.lexicalService
            .getTypes()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
              this.types = data;
            });

          // Ottiene l'elenco degli autori
          this.get_authors_subscription = this.lexicalService
            .getAuthors()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
              this.authors = data;
            });

          // Ottiene l'elenco delle parti del discorso
          this.get_pos_subscription = this.lexicalService
            .getPos()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
              this.partOfSpeech = data;
            });

          // Ottiene l'elenco degli stati delle voci
          this.get_status_subscription = this.lexicalService
            .getStatus()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
              this.status = data;
            });
        }
      });

    // Sottoscrizioni per ottenere dati iniziali
    this.get_lex_entry_list_subscription = this.lexicalService
      .getLexicalEntriesList(this.parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.nodes = data['list'];
          this.counter = data['totalHits'];
        },
        (error) => {
          // Gestisce eventuali errori
        }
      );

    // Sottoscrizioni ripetute per ottenere dati iniziali (lingue, tipi, autori, parti del discorso, stati)
    // Queste sottoscrizioni sembrano duplicate rispetto a quelle nel blocco precedente e potrebbero essere parte di una logica di inizializzazione o di un errore di duplicazione
    this.get_languages_subscription = this.lexicalService
      .getLanguages()
      .subscribe((data) => {
        this.languages = data;
      });

    this.get_types_subscription = this.lexicalService
      .getTypes()
      .subscribe((data) => {
        this.types = data;
      });

    this.get_authors_subscription = this.lexicalService
      .getAuthors()
      .subscribe((data) => {
        this.authors = data;
      });

    this.get_pos_subscription = this.lexicalService
      .getPos()
      .subscribe((data) => {
        this.partOfSpeech = data;
      });

    this.get_status_subscription = this.lexicalService
      .getStatus()
      .subscribe((data) => {
        this.status = data;
      });
  }

  // Gestisce le modifiche ai valori del form di filtro, applicando un ritardo e reagendo alla distruzione del componente
  onChanges() {
    // Ascolta i cambiamenti di valore nel form di filtro con un debounce di 500ms
    // e continua finché l'observable destroy$ non emette un segnale
    this.filterForm.valueChanges
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe((searchParams) => {
        // Resetta l'offset a 0 per una nuova ricerca
        this.offset = 0;
        // Chiama la funzione per filtrare le voci lessicali basate sui parametri di ricerca
        this.lexicalEntriesFilter(searchParams);
      });
  }

  // Aggiunge un sottoelemento all'albero lessicale in base al segnale ricevuto
  addSubElement(signal?) {
    // Ritarda l'esecuzione per permettere eventuali aggiornamenti asincroni
    setTimeout(() => {
      let instanceName;
      // Estrae le informazioni dal segnale
      let lex = signal.lex;
      let data = signal.data;
      // Stampa in console per debug
      console.log(lex);
      console.log(data);
      // Assegna un nome di istanza in base alla richiesta del segnale
      switch (lex.request) {
        case 'form':
          instanceName = 'form';
          break;
        case 'sense':
          instanceName = 'sense';
          break;
        case 'etymology':
          instanceName = 'etymology';
          break;
        case 'subterm':
          instanceName = 'lexicalEntry';
          break;
        case 'constituent':
          instanceName = 'component';
          break;
      }
      // Cerca nel modello dell'albero una corrispondenza per aggiungere il nuovo nodo
      this.lexicalEntryTree.treeModel.getNodeBy((x) => {
        // Controlla se l'elemento corrente ha un'entrata lessicale corrispondente
        if (lex.lexicalEntry != undefined) {
          if (x.data.lexicalEntry === lex.lexicalEntry) {
            // Se non ci sono figli e l'elemento non è espanso, espande il nodo
            if (x.data.children == undefined && !x.isExpanded) {
              x.expand();
              var that = this;
              // Prova ad aggiornare i figli ogni 3 secondi finché non sono definiti
              this.interval = setInterval((val) => {
                if (x.data.children != undefined) {
                  this.lexicalEntryTree.treeModel.getNodeBy((y) => {
                    if (y.data[instanceName] != undefined) {
                      // Imposta il flag dell'autore in base al creatore del dato
                      if (y.data['creator'] == x.data.creator) {
                        y.data['flagAuthor'] = false;
                      } else {
                        y.data['flagAuthor'] = true;
                      }
                      // Se il dato corrisponde, rende il nodo attivo e visibile
                      if (y.data[instanceName] === data[instanceName]) {
                        y.setActiveAndVisible();
                        clearInterval(that.interval);
                        return true;
                      } else {
                        return false;
                      }
                    } else {
                      return false;
                    }
                  });
                }
              }, 3000);
            } else if (x.data.children != undefined) {
              // Controlla l'esistenza del nodo richiesto tra i figli
              let checkExistence = x.data.children.filter((element) => {
                return element.label === lex.request;
              });
              if (checkExistence.length == 1) {
                // Se il nodo esiste, aggiorna le informazioni e lo aggiunge
                x.data.children.filter((element) => {
                  if (element.label === lex.request) {
                    // Gestisce casi specifici basati sulla richiesta
                    if (lex.request == 'sense') {
                      data['label'] = 'no definition';
                      data['definition'] = 'no definition';
                    } else if (lex.request == 'etymology') {
                      data['label'] = 'Etymology of: ' + lex.parentNodeLabel;
                      console.log(data['label']);
                    } else if (lex.request == 'subterm') {
                      data.label = data.label;
                      data.children = null;
                      data.hasChildren = false;
                    } else if (lex.request == 'constituent') {
                      data.label = '';
                      data.children = null;
                      data.hasChildren = false;
                    } else {
                      data['label'] = data[instanceName];
                    }
                    // Imposta il flag dell'autore
                    if (data['creator'] == x.data.creator) {
                      data['flagAuthor'] = false;
                    } else {
                      data['flagAuthor'] = true;
                    }
                    // Incrementa il contatore e aggiunge il dato ai figli
                    element.count++;
                    element.children.push(data);
                    // Aggiorna il modello dell'albero
                    this.lexicalEntryTree.treeModel.update();
                    // Rende il nodo attivo e visibile se corrisponde
                    this.lexicalEntryTree.treeModel.getNodeBy((y) => {
                      if (
                        y.data.etymology == undefined &&
                        y.data.label === data['label'] &&
                        lex.request != 'subterm'
                      ) {
                        y.setActiveAndVisible();
                      } else if (
                        y.data.etymology != undefined &&
                        y.data.etymology === data['etymology'] &&
                        lex.request != 'subterm'
                      ) {
                        y.setActiveAndVisible();
                      }
                    });
                    return true;
                  } else {
                    return false;
                  }
                });
              } else if (checkExistence.length == 0) {
                // Se il nodo non esiste, lo crea e lo aggiunge
                let node = {
                  hasChildren: true,
                  label: lex.request,
                  children: [],
                  count: 0,
                };
                x.data.children.push(node);
                // Ordina i figli alfabeticamente
                x.data.children.sort(function (a, b) {
                  var textA = a.label.toUpperCase();
                  var textB = b.label.toUpperCase();
                  return textA < textB ? -1 : textA > textB ? 1 : 0;
                });
                // Aggiorna il modello dell'albero
                this.lexicalEntryTree.treeModel.update();
                // Aggiunge il dato al nodo appena creato
                x.data.children.filter((element) => {
                  if (element.label === lex.request) {
                    // Imposta il flag dell'autore
                    if (data['creator'] == x.data.creator) {
                      data['flagAuthor'] = false;
                    } else {
                      data['flagAuthor'] = true;
                    }
                    // Gestisce casi specifici per la richiesta
                    if (lex.request == 'sense') {
                      data['definition'] = 'no definition';
                      data.label = 'no definintion';
                    } else if (lex.request == 'subterm') {
                      data.label = data.label;
                      data.children = null;
                      data.hasChildren = false;
                    } else {
                      data['label'] = data[instanceName];
                    }
                    // Incrementa il contatore e aggiunge il dato
                    element.count++;
                    element.children.push(data);
                    // Aggiorna il modello dell'albero e rende il nodo attivo e visibile
                    this.lexicalEntryTree.treeModel.update();
                    this.lexicalEntryTree.treeModel.getNodeBy((y) => {
                      if (
                        y.data.label === data['label'] &&
                        lex.request != 'subterm'
                      ) {
                        y.setActiveAndVisible();
                      }
                    });
                    return true;
                  } else {
                    return false;
                  }
                });
              }
            } else {
              return false;
            }
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      });
    }, 300);
  }

  // Funzione che gestisce la cancellazione di una voce lessicale in base a vari segnali
  lexEntryDeleteReq(signal?) {
    // Utilizza getNodeBy per cercare nel modello dell'albero lessicale e trovare il nodo specificato
    this.lexicalEntryTree.treeModel.getNodeBy((x) => {
      // Controlla se il segnale si riferisce a una voce lessicale senza forma o senso specificati
      if (
        signal.lexicalEntry != undefined &&
        signal.form == undefined &&
        signal.sense == undefined
      ) {
        // Se il nodo corrente corrisponde alla voce lessicale cercata
        if (x.data.lexicalEntry === signal.lexicalEntry) {
          // Rimuove il nodo corrente dai figli del suo nodo genitore
          x.parent.data.children.splice(
            x.parent.data.children.indexOf(x.data),
            1
          );
          // Gestisce il conteggio dei subtermini, decrementandolo se non è zero
          let countSubterm = x.parent.data.count;
          if (countSubterm != 0) {
            x.parent.data.count--;
            countSubterm--;
          }
          // Aggiorna l'albero lessicale se non ci sono nodi rimasti
          if (this.nodes.length == 0) {
            this.lexicalEntriesFilter(this.parameters);
          }
          // Se dopo la rimozione il conteggio dei subtermini arriva a zero, rimuove anche il genitore
          if (countSubterm == 0) {
            x.parent.parent.data.children.splice(
              x.parent.parent.data.children.indexOf(x.parent.data),
              1
            );
          }
          console.log(x.parent);
          // Aggiorna il modello dell'albero lessicale
          this.lexicalEntryTree.treeModel.update();
          return true;
        } else {
          return false;
        }
        // Gestisce il caso in cui il segnale si riferisce a una specifica forma
      } else if (signal.form != undefined) {
        if (x.data.form === signal.form) {
          // Logica simile al caso della voce lessicale, ma specifica per la forma
          x.parent.data.children.splice(
            x.parent.data.children.indexOf(x.data),
            1
          );
          let countForm = x.parent.data.count;
          if (countForm != 0) {
            x.parent.data.count--;
            countForm--;
          }
          if (countForm == 0) {
            x.parent.parent.data.children.splice(
              x.parent.parent.data.children.indexOf(x.parent.data),
              1
            );
          }
          console.log(x.parent);
          this.lexicalEntryTree.treeModel.update();
          return true;
        } else {
          return false;
        }
        // Gestisce il caso in cui il segnale si riferisce a un senso specifico
      } else if (signal.sense != undefined) {
        if (x.data.sense === signal.sense) {
          // Logica simile al caso della voce lessicale, ma specifica per il senso
          x.parent.data.children.splice(
            x.parent.data.children.indexOf(x.data),
            1
          );
          let countSense = x.parent.data.count;
          if (countSense != 0) {
            x.parent.data.count--;
            countSense--;
          }
          if (countSense == 0) {
            x.parent.parent.data.children.splice(
              x.parent.parent.data.children.indexOf(x.parent.data),
              1
            );
          }
          console.log(x.parent);
          this.lexicalEntryTree.treeModel.update();
          return true;
        } else {
          return false;
        }
        // Gestisce casi aggiuntivi specificati dal segnale, inclusi etimologia, nome dell'istanza del componente, ecc.
      } else if (signal.etymology != undefined) {
        // Codice specifico per il trattamento dell'etimologia
        // La logica è simile ai casi precedenti
      } else if (signal.componentInstanceName != undefined) {
        // Codice specifico per il trattamento del nome dell'istanza del componente
        // La logica è simile ai casi precedenti
      } else if (signal.subtermInstanceName != undefined) {
        // Codice specifico per il trattamento dei subtermini
        // Questo caso gestisce i subtermini in modo leggermente diverso, basandosi sul nome dell'istanza genitore
      } else {
        return false;
      }
      return false;
    });
  }

  // Filtra le voci lessicali in base ai nuovi parametri ricevuti
  lexicalEntriesFilter(newPar) {
    // Imposta un ritardo per resettare lo scroll della viewport all'inizio
    setTimeout(() => {
      // Seleziona l'elemento della viewport e reimposta lo scroll su 0
      const viewPort_prova = this.element.nativeElement.querySelector(
        'tree-viewport'
      ) as HTMLElement;
      viewPort_prova.scrollTop = 0;
    }, 300);

    // Mostra l'icona di caricamento durante la ricerca
    this.searchIconSpinner = true;
    let parameters = newPar;
    // Imposta offset e limit per la paginazione dei risultati della ricerca
    parameters['offset'] = this.offset;
    parameters['limit'] = this.limit;
    console.log(parameters);
    // Effettua la chiamata al servizio per ottenere le voci lessicali e gestisce la risposta
    this.lexicalService
      .getLexicalEntriesList(newPar)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          // Gestisce la visualizzazione in base alla presenza di voci lessicali
          if (data['list'].length > 0) {
            this.show = false;
          } else {
            this.show = true;
          }
          // Aggiorna i nodi dell'albero con i nuovi dati
          this.nodes = data['list'];
          // Aggiorna il contatore totale dei risultati
          this.counter = data['totalHits'];
          // Aggiorna l'albero delle voci lessicali
          this.lexicalEntryTree.treeModel.update();
          // Aggiorna la visualizzazione dell'albero
          this.updateTreeView();
          // Nasconde l'icona di caricamento
          this.searchIconSpinner = false;
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // Restituisce i parametri iniziali
  getParameters() {
    return this.initialValues;
  }

  // Inizializzazione dopo il caricamento della vista
  ngAfterViewInit(): void {
    // Inizializza i popover con le opzioni specificate
    //@ts-ignore
    $('[data-toggle="popover"]').popover({
      html: true,
      title: this.titlePopover,
      content: this.popoverWildcards,
    });
  }

  // Reimposta i campi ai valori iniziali
  resetFields() {
    // Azzera i valori dei campi di testo e dei parametri di ricerca
    this.initialValues.text = '';
    this.parameters.text = '';
    this.offset = 0;
    // Reimposta il form dei filtri ai valori iniziali senza emettere eventi
    this.filterForm.reset(this.initialValues, { emitEvent: false });
    // Applica il filtro dopo un ritardo e aggiorna l'albero delle voci lessicali
    setTimeout(() => {
      this.lexicalEntriesFilter(this.parameters);
      this.lexicalEntryTree.treeModel.update();
    }, 500);
  }

  // Aggiorna la vista dell'albero
  updateTreeView() {
    // Dopo un ritardo, segnala un cambiamento di dimensione e inizializza i tooltip
    setTimeout(() => {
      this.lexicalEntryTree.sizeChanged();
      //@ts-ignore
      $('.lexical-tooltip').tooltip();
    }, 1000);
  }

  // Funzione gestore eventi principale, gestisce diverse azioni basate sul tipo di evento ricevuto
  onEvent = ($event: any) => {
    // Stampa l'evento ricevuto in console
    console.log($event);
    // Imposta un timeout per inizializzare i tooltip con una libreria esterna dopo 2 secondi
    setTimeout(() => {
      //@ts-ignore
      $('.lexical-tooltip').tooltip(); // Inizializza i tooltip
    }, 2000);

    // Gestisce l'evento 'activate' per le voci lessicali senza forma, senso o etimologia definiti
    if (
      $event.eventName == 'activate' &&
      $event.node.data.lexicalEntry != undefined &&
      $event.node.data.form == undefined &&
      $event.node.data.sense == undefined &&
      $event.node.data.etymology == undefined
    ) {
      // Recupera i dati della voce lessicale selezionata e li invia ai diversi tab dopo aver ricevuto una risposta
      let idLexicalEntry = $event.node.data.lexicalEntry;
      this.lexicalService
        .getLexEntryData(idLexicalEntry)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data); // Stampa i dati ricevuti
            this.selectedNodeId = $event.node.data.lexicalEntry;
            // Invia i dati ai rispettivi tab
            this.lexicalService.sendToCoreTab(data);
            this.lexicalService.sendToRightTab(data);
            this.lexicalService.sendToEtymologyTab(null);
            // Aggiorna i dati della card principale
            this.lexicalService.updateCoreCard({
              lastUpdate: data['lastUpdate'],
              creationDate: data['creationDate'],
            });

            // Gestione dell'espansione dei tab in base alla loro apertura
            if (
              !this.expander.isEditTabOpen() &&
              !this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                !this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEdit(true);
                this.expander.openCollapseEdit(true);
              }
            } else if (
              !this.expander.isEditTabOpen() &&
              this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEpigraphy(false);
                this.expander.openCollapseEdit(true);
              }
            }

            // Mostra un modal e lo configura per non chiudersi con interazioni esterne
            //@ts-ignore
            $('#coreTabModal').modal('show');
            $('.modal-backdrop').appendTo('.core-tab-body');
            //@ts-ignore
            $('#coreTabModal').modal({ backdrop: 'static', keyboard: false });
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');

            // Gestisce la visualizzazione del pannello delle note in base al contenuto di 'note'
            if (data.note != undefined) {
              if (data.note != '') {
                this.lexicalService.triggerNotePanel(true);
              } else {
                this.lexicalService.triggerNotePanel(false);
              }
            }
          },
          (error) => {
            console.log(error);
          }
        );
    } else if (
      $event.eventName == 'activate' &&
      $event.node.data.form != undefined
    ) {
      // Analogamente ai casi precedenti, gestisce l'evento 'activate' per le forme

      let formId = $event.node.data.form;

      this.lexicalService
        .getFormData(formId, 'core')
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.selectedNodeId = $event.node.data.form;
            // Imposta dati addizionali e li invia ai rispettivi tab
            data['parentNodeLabel'] = $event.node.parent.parent.data.label;
            data['parentNodeInstanceName'] =
              $event.node.parent.parent.data.lexicalEntry;
            this.lexicalService.sendToCoreTab(data);
            this.lexicalService.sendToEtymologyTab(null);
            this.lexicalService.sendToRightTab(data);
            this.lexicalService.sendToAttestationPanel(null);
            this.lexicalService.triggerAttestationPanel(false);
            this.lexicalService.updateCoreCard({
              lastUpdate: data['lastUpdate'],
              creationDate: data['creationDate'],
            });
            // Mostra un modal per la forma
            //@ts-ignore
            $('#coreTabModal').modal('show');
            $('.modal-backdrop').appendTo('.core-tab-body');
            //@ts-ignore
            $('#coreTabModal').modal({ backdrop: 'static', keyboard: false });
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');

            // Gestione dell'espansione dei tab per le forme
            if (
              !this.expander.isEditTabOpen() &&
              !this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                !this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEdit(true);
                this.expander.openCollapseEdit(true);
              }
            } else if (
              !this.expander.isEditTabOpen() &&
              this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEpigraphy(false);
                this.expander.openCollapseEdit(true);
              }
            }

            // Gestione del pannello delle note per le forme
            if (data.note != undefined) {
              if (data.note != '') {
                this.lexicalService.triggerNotePanel(true);
              } else {
                this.lexicalService.triggerNotePanel(false);
              }
            }
          },
          (error) => {
            //console.log(error)
          }
        );
    } else if (
      $event.eventName == 'activate' &&
      $event.node.data.sense != undefined
    ) {
      // Gestisce l'evento 'activate' per i sensi

      let senseId = $event.node.data.sense;

      this.lexicalService
        .getSenseData(senseId, 'core')
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            this.selectedNodeId = $event.node.data.sense;
            // Imposta dati addizionali e li invia ai rispettivi tab
            data['parentNodeLabel'] = $event.node.parent.parent.data.label;
            data['parentNodeInstanceName'] =
              $event.node.parent.parent.data.lexicalEntry;
            data['type'] = $event.node.parent.parent.data.type;
            console.log(data);
            this.lexicalService.sendToCoreTab(data);
            this.lexicalService.sendToEtymologyTab(null);
            this.lexicalService.sendToRightTab(data);
            this.lexicalService.updateCoreCard({
              lastUpdate: data['lastUpdate'],
              creationDate: data['creationDate'],
            });

            // Mostra un modal per il senso
            //@ts-ignore
            $('#coreTabModal').modal('show');
            $('.modal-backdrop').appendTo('.core-tab-body');
            //@ts-ignore
            $('#coreTabModal').modal({ backdrop: 'static', keyboard: false });
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');

            // Gestione dell'espansione dei tab per i sensi
            if (
              !this.expander.isEditTabOpen() &&
              !this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                !this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEdit(true);
                this.expander.openCollapseEdit(true);
              }
            } else if (
              !this.expander.isEditTabOpen() &&
              this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEpigraphy(false);
                this.expander.openCollapseEdit(true);
              }
            }

            // Gestione del pannello delle note per i sensi
            if (data.note != undefined) {
              if (data.note != '') {
                this.lexicalService.triggerNotePanel(true);
              } else {
                this.lexicalService.triggerNotePanel(false);
              }
            }
          },
          (error) => {
            //console.log(error)
          }
        );
    } else if (
      $event.eventName == 'activate' &&
      $event.node.data.etymology != undefined
    ) {
      // Gestisce l'evento 'activate' per le etimologie

      let etymologyId = $event.node.data.etymology;

      this.lexicalService
        .getEtymologyData(etymologyId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            this.selectedNodeId = $event.node.data.etymology;
            // Imposta dati addizionali e li invia al tab dell'etimologia
            data['parentNodeLabel'] = $event.node.parent.parent.data.label;
            data['parentNodeInstanceName'] =
              $event.node.parent.parent.data.lexicalEntry;
            console.log(data);
            data['type'] = $event.node.parent.parent.data.type;
            this.lexicalService.sendToEtymologyTab(data);
            this.lexicalService.sendToRightTab(data);
            this.lexicalService.updateCoreCard({
              lastUpdate: data['etymology']['lastUpdate'],
              creationDate: data['etymology']['creationDate'],
            });

            // Mostra un modal per l'etimologia
            //@ts-ignore
            $('#etymologyTabModal').modal('show');
            $('.modal-backdrop').appendTo('.etym-tab-body');
            //@ts-ignore
            $('#etymologyTabModal').modal({
              backdrop: 'static',
              keyboard: false,
            });
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');

            // Gestione dell'espansione dei tab per l'etimologia
            if (
              !this.expander.isEditTabOpen() &&
              !this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                !this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEdit(true);
                this.expander.openCollapseEdit(true);
              }
            } else if (
              !this.expander.isEditTabOpen() &&
              this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEpigraphy(false);
                this.expander.openCollapseEdit(true);
              }
            }

            // Gestione del pannello delle note per l'etimologia
            if (data.note != undefined) {
              if (data.note != '') {
                this.lexicalService.triggerNotePanel(true);
              } else {
                this.lexicalService.triggerNotePanel(false);
              }
            }
          },
          (error) => {
            console.log(error);
          }
        );
    } else if (
      $event.eventName == 'activate' &&
      $event.node.data.component != undefined
    ) {
      // Gestisce l'evento 'activate' per i componenti

      let compId = $event.node.data.componentInstanceName;
      let parentInstanceLabel = $event.node.parent.parent.data.label;
      let parentInstanceName = $event.node.parent.parent.data.lexicalEntry;

      this.lexicalService
        .getLexEntryData(parentInstanceName)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            this.selectedNodeId = $event.node.data.parentNodeInstanceName;
            console.log(data);
            this.lexicalService.sendToRightTab(data);
            this.lexicalService.updateCoreCard({
              lastUpdate: data['lastUpdate'],
              creationDate: data['creationDate'],
            });

            // Mostra un modal per il componente
            //@ts-ignore
            $('#etymologyTabModal').modal('show');
            $('.modal-backdrop').appendTo('.etym-tab-body');
            //@ts-ignore
            $('#etymologyTabModal').modal({
              backdrop: 'static',
              keyboard: false,
            });
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');

            // Gestione dell'espansione dei tab per i componenti
            if (
              !this.expander.isEditTabOpen() &&
              !this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                !this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEdit(true);
                this.expander.openCollapseEdit(true);
              }
            } else if (
              !this.expander.isEditTabOpen() &&
              this.expander.isEpigraphyTabOpen()
            ) {
              if (
                !this.expander.isEditTabExpanded() &&
                this.expander.isEpigraphyTabExpanded()
              ) {
                this.expander.expandCollapseEpigraphy(false);
                this.expander.openCollapseEdit(true);
              }
            }

            // Gestione del pannello delle note per i componenti
            if (data.note != undefined) {
              if (data.note != '') {
                this.lexicalService.triggerNotePanel(true);
              } else {
                this.lexicalService.triggerNotePanel(false);
              }
            }
          },
          (error) => {
            console.log(error);
          }
        );
    }
  };

  // Gestisce l'evento di pressione di un tasto per controllare la visibilità di un elemento.
  // Utilizza un timeout per ritardare l'esecuzione e verificare se ci sono risultati disponibili
  // nella struttura dell'albero. Se non ci sono risultati, mostra un elemento specifico.
  onKey = ($event: any) => {
    var that = this;
    setTimeout(function () {
      // Ottiene il numero di elementi figli del secondo div sotto 'tree-node-collection'
      var results = document.body.querySelectorAll(
        'tree-node-collection > div'
      )[1].children.length;
      // Se non ci sono risultati, imposta la proprietà 'show' su true per mostrare un elemento specifico
      if (results == 0) {
        that.show = true;
      } else {
        that.show = false;
      }
    }, 5);
  };

  // Gestisce l'evento di scroll verso il basso. Carica nuovi dati nell'albero incrementando l'offset
  // e mostra un modal durante il caricamento. Al termine nasconde il modal e aggiorna l'albero.
  async onScrollDown(treeModel: TreeModel) {
    // Incrementa l'offset per caricare nuovi dati
    this.offset += 500;
    // Mostra un modal per indicare il caricamento
    this.modalShow = true;

    // Prepara i parametri per la richiesta, includendo l'offset aggiornato e un limite
    let parameters = this.filterForm.value;
    parameters['offset'] = this.offset;
    parameters['limit'] = this.limit;

    try {
      // Effettua una richiesta asincrona per ottenere nuovi dati e li aggiunge all'albero
      let get_entry_list = await this.lexicalService
        .getLexicalEntriesList(parameters)
        .toPromise();
      // Nasconde il modal di caricamento e rimuove il backdrop
      for (var i = 0; i < get_entry_list['list'].length; i++) {
        this.nodes.push(get_entry_list['list'][i]);
      }
      // Aggiorna l'albero con i nuovi dati e nasconde il modal
      this.lexicalEntryTree.treeModel.update();
      this.updateTreeView();
      this.modalShow = false;

      // Nasconde nuovamente il modal dopo un breve ritardo per assicurarsi che sia completamente chiuso
      setTimeout(() => {
        //@ts-ignore
        $('#lazyLoadingModal').modal('hide');
        $('.modal-backdrop').remove();
      }, 300);
    } catch (error) {
      console.log(error);
    }
  }

  // Carica i figli di un nodo specifico dell'albero. Questo include la richiesta di dati aggiuntivi
  // come forme, sensi, etimologie e subtermini di un'entità lessicale.
  async getChildren(node: any) {
    let newNodes: any;
    // Controlla se il nodo ha un'entità lessicale associata
    if (node.data.lexicalEntry != undefined) {
      try {
        // Ottiene l'istanza dell'entità lessicale e richiede i suoi elementi
        let instance = node.data.lexicalEntry;
        let data = await this.lexicalService
          .getLexEntryElements(instance)
          .toPromise();
        // Filtra gli elementi per escludere quelli non desiderati
        data['elements'] = data['elements'].filter(function (obj) {
          return (
            obj.count != 0 &&
            obj.label != 'lexicalConcept' &&
            obj.label != 'concept'
          );
        });
        // Mappa gli elementi filtrati per prepararli per l'inserimento nell'albero
        newNodes = data['elements'].map((c) => Object.assign({}, c));

        // Se ci sono nuovi nodi, elabora ciascuno per caricare dati aggiuntivi come necessario
        if (Object.keys(newNodes).length > 0) {
          for (const element of newNodes) {
            // Carica dati aggiuntivi a seconda del tipo di elemento (forma, senso, etimologia, subtermine)
            // e li aggiunge come figli dell'elemento corrente
            if (element.label == 'form') {
              let form_data = await this.lexicalService.getLexEntryForms(instance).toPromise();
              element.isExpanded = true;
              element.children = [];

              form_data.forEach(form => {
                element.children.push(form);
              });
            } else if (element.label == 'sense') {
              let sense_data = await this.lexicalService.getSensesList(instance).toPromise();
              element.isExpanded = true;
              element.children = [];
              sense_data.forEach(sense => {
                element.children.push(sense);
              });
            } else if (element.label == 'etymology') {
              let etymology_data = await this.lexicalService.getEtymologies(instance).toPromise();
              element.isExpanded = true;
              element.children = [];
              etymology_data.forEach(etym => {
                element.children.push(etym);
              });
            } else if (element.label == 'subterm') {
              let subterm_data = await this.lexicalService.getSubTerms(instance).toPromise();
              element.isExpanded = true;
              element.children = [];
              subterm_data.forEach(subterm => {
                subterm.hasChildren = false;
                element.children.push(subterm);
              });
            }
          }
          return newNodes;
        } else {
          // Se non ci sono nuovi nodi, mostra un messaggio informativo
          this.toastr.info('No childs for this node', 'Info', {
            timeOut: 5000,
          });
          return newNodes;
        }
      } catch (error) {
        console.log(error);
        // Gestisce errori non previsti mostrando un messaggio di errore
        if (error.status != 200) {
          this.toastr.error(
            'Something went wrong, please check the log',
            'Error',
            { timeOut: 5000 }
          );
        }
      }
    }
  }

  // Funzione per copiare un testo. Accetta un oggetto come parametro.
  copyText(val: object) {
    console.log(val); // Stampa l'oggetto passato come parametro.

    let value = '';
    // Controlla le proprietà dell'oggetto e assegna a 'value' la proprietà corrispondente, se presente.
    // Dà priorità a 'lexicalEntry', poi 'form', 'sense' e 'etymology' in quest'ordine.
    if (
      val['lexicalEntry'] != undefined &&
      val['sense'] == undefined &&
      val['etymology'] == undefined &&
      val['form'] == undefined
    ) {
      value = val['lexicalEntry']; // Assegna 'lexicalEntry' se solo questa proprietà è definita.
    } else if (val['form'] != undefined) {
      value = val['form']; // Assegna 'form' se definita, indipendentemente dalle altre proprietà.
    } else if (val['sense'] != undefined) {
      value = val['sense']; // Assegna 'sense' se definita, indipendentemente dalle altre proprietà.
    } else if (val['etymology'] != undefined) {
      value = val['etymology']; // Assegna 'etymology' se definita, indipendentemente dalle altre proprietà.
    }
    this.copySubject.next(value); // Emette il valore selezionato tramite un subject.
  }

  // Funzione chiamata quando l'istanza del componente viene distrutta.
  ngOnDestroy(): void {
    // Disiscrive tutte le sottoscrizioni per prevenire perdite di memoria.
    this.delete_req_subscription.unsubscribe();
    this.add_sub_subscription.unsubscribe();
    this.copy_subject_subscription.unsubscribe();
    this.refresh_filter_subscription.unsubscribe();
    this.get_lex_entry_list_subscription.unsubscribe();
    this.get_languages_subscription.unsubscribe();
    this.get_types_subscription.unsubscribe();
    this.get_authors_subscription.unsubscribe();
    this.get_pos_subscription.unsubscribe();
    this.get_status_subscription.unsubscribe();

    // Emette un segnale per indicare la distruzione del componente e completa l'observable.
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
