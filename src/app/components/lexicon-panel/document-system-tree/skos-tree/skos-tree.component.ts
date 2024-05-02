import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import {
  IActionMapping,
  TREE_ACTIONS,
  KEYS,
  ITreeState,
  ITreeOptions,
  TreeModel,
  TreeNode,
} from '@circlon/angular-tree-component';
import {
  NgbActiveModal,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, tap, timeout } from 'rxjs/operators';
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { v4 } from 'uuid';

// Definizione di un oggetto per mappare azioni specifiche legate all'input dell'utente, come click del mouse e pressioni di tasti
const actionMapping: IActionMapping = {
  // Mappatura delle azioni del mouse
  mouse: {
    // Funzione eseguita quando si effettua un click su un nodo dell'albero
    click: (tree, node, $event) => {
      // Se il tasto shift è premuto durante il click, attiva/disattiva il nodo corrente in modalità multipla, altrimenti attiva/disattiva il nodo corrente in modalità singola
      $event.shiftKey
        ? TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
        : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);

      // Se il nodo corrente è in modalità rinomina, previene l'azione di default per evitare conflitti
      if (node.data.rename_mode) {
        $event.preventDefault();
      }
    },
    // Funzione eseguita quando si clicca sull'elemento espandi/contrai di un nodo dell'albero
    expanderClick: (tree, node, $event) => {
      // Se il nodo corrente è in modalità rinomina, previene l'azione di default
      if (node.data.rename_mode) {
        $event.preventDefault();
      } else {
        // Altrimenti, attiva/disattiva lo stato di espansione del nodo corrente
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    },
  },
  // Mappatura delle azioni legate alla pressione dei tasti
  keys: {
    // Associa la pressione del tasto ENTER all'alert del nome del nodo corrente
    [KEYS.ENTER]: (tree, node, $event) => alert(`This is ${node.data.name}`),
  },
};

@Component({
  selector: 'app-skos-tree',
  templateUrl: './skos-tree.component.html',
  styleUrls: ['./skos-tree.component.scss'],
})
export class SkosTreeComponent implements OnInit, OnDestroy {
  state!: ITreeState;
  @ViewChild('skosTree') skosTree: any;
  @ViewChild('lexicalConceptRemoverModal') lexicalConceptRemoverModal;
  @ViewChild(ContextMenuComponent) public skosMenu: ContextMenuComponent;

  selectedNodeId;
  destroy$: Subject<boolean> = new Subject();

  labelView = true;
  idView = false;

  searchIconSpinner = false;
  initialValues;
  skosFilterForm = new FormGroup({
    search_text: new FormControl(null),
    search_mode: new FormControl(null),
  });

  counter = 0;
  skos_nodes = [];
  show = false;
  offset: number;
  modalShow: boolean;
  limit: any;

  processRequestForm: FormGroup;

  nodeToRemove: any;

  // `options`: Configurazione per un componente albero, utilizzata per definire le operazioni ammesse e il comportamento dell'albero.
  options: ITreeOptions = {
    // `getChildren`: Funzione che viene chiamata per ottenere i figli di un nodo. È legata al contesto attuale (`this`).
    getChildren: this.getChildren.bind(this),

    actionMapping, // Mappatura delle azioni personalizzate sull'albero. Questa parte del codice viene lasciata così com'è per la tua richiesta.

    // `allowDrag`: Funzione che determina se un nodo può essere trascinato. Ritorna `true` se il nodo non contiene un `conceptSet` definendo così nodi trascinabili.
    allowDrag: (node) => {
      return node.data.conceptSet == undefined;
    },

    // `allowDrop`: Funzione che determina se un elemento può essere rilasciato in una certa posizione dell'albero (`parent`, `index`).
    // Permette il rilascio se l'elemento non contiene un `conceptSet`, mantenendo la coerenza con `allowDrag`.
    allowDrop: (element, { parent, index }) => {
      return element.data.conceptSet == undefined;
    },

    // `getNodeClone`: Funzione che definisce come clonare un nodo. È utilizzata per creare una copia di un nodo con un nuovo `id` univoco e un nome che indica che si tratta di una copia.
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(), // Genera un nuovo identificativo univoco per il clone.
      name: `copy of ${node.data.name}`, // Prefissa il nome del nodo clonato con "copy of".
    }),
  };

  constructor(
    private element: ElementRef,
    private formBuilder: FormBuilder,
    private lexicalService: LexicalEntriesService,
    private conceptService: ConceptService,
    private expander: ExpanderService,
    private toastr: ToastrService,
    private biblioService: BibliographyService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    // Inizializza il form per gestire la richiesta con un valore predefinito.
    this.processRequestForm = this.formBuilder.group({
      oneOrAll: new FormControl('one'),
    });

    // Inizializza il form per i filtri SKOS con valori predefiniti.
    this.skosFilterForm = this.formBuilder.group({
      search_text: new FormControl(null), // Campo per il testo di ricerca.
      search_mode: new FormControl('startsWith'), // Modalità di ricerca, preimpostata su "startsWith".
    });
    // Ascolta i cambiamenti sui form e applica le logiche corrispondenti.
    this.onChanges();
    // Salva i valori iniziali del form dei filtri SKOS.
    this.initialValues = this.skosFilterForm.value;
    // Carica l'albero dei concetti iniziale.
    this.loadTree();
    // Si sottoscrive al flusso di cancellazione SKOS, eseguendo una funzione quando riceve un segnale.
    this.conceptService.deleteSkosReq$
      .pipe(takeUntil(this.destroy$))
      .subscribe((signal) => {
        // Se riceve un segnale non nullo, effettua la richiesta di cancellazione.
        if (signal != null) {
          this.skosDeleteRequest(signal);
        }
      });

    // Si sottoscrive al flusso per aggiungere un sottoelemento, eseguendo una funzione quando riceve un segnale.
    this.conceptService.addSubReq$.subscribe((signal) => {
      // Se riceve un segnale non nullo, aggiunge un sottoelemento.
      if (signal != null) {
        this.addSubElement(signal);
      }
    });
  }

  // Funzione che ascolta i cambiamenti nel form dei filtri SKOS e applica la logica di filtraggio o ricaricamento dell'albero.
  onChanges() {
    this.skosFilterForm.valueChanges
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe((searchParams) => {
        console.log(searchParams);
        // Se il campo di testo di ricerca non è vuoto, applica il filtro di ricerca.
        if (searchParams.search_text != '') {
          this.searchFilter(searchParams);
        } else {
          // Se il campo di testo di ricerca è vuoto, ricarica l'albero dei concetti.
          this.loadTree();
        }
      });
  }

  // Funzione gestore per eventi generali, con logica specifica basata sul tipo di evento e i dati associati.
  onEvent = ($event: any) => {
    console.log($event);

    // Se l'evento è di tipo "activate" e il nodo ha un insieme di concetti associato, esegue una serie di operazioni.
    if (
      $event.eventName == 'activate' &&
      $event.node.data.conceptSet != undefined
    ) {
      // Ottiene l'istanza del concetto lessicale dal nodo dell'evento.
      let instance = $event.node.data.lexicalConcept;
      // Richiede i dati del concetto lessicale e si sottoscrive alla risposta.
      this.conceptService
        .getLexicalConceptData(instance)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Imposta l'ID del nodo selezionato e invia i dati ai pannelli corrispondenti.
            this.selectedNodeId = data.lexicalConcept;
            this.lexicalService.sendToCoreTab(data);
            this.lexicalService.sendToRightTab(data);
            console.log(data);
            // Aggiorna la carta centrale con le ultime informazioni.
            this.lexicalService.updateCoreCard({
              lastUpdate: data['lastUpdate'],
              creationDate: $event.node.data['creationDate'],
            });
            // Gestisce la logica di espansione e collasso dei pannelli di modifica e epigrafia.
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

            // Gestisce la visualizzazione del pannello delle note in base alla presenza di note nei dati.
            if (data.note != undefined) {
              if (data.note != '') {
                this.lexicalService.triggerNotePanel(true);
              } else {
                this.lexicalService.triggerNotePanel(false);
              }
            }
          },

          (error) => {
            // Log dell'errore in caso di fallimento della richiesta.
            console.log(error);
          }
        );
    }
  };

  // Verifica se l'elemento fornito è un insieme di concetti
  isConceptSet = (item: any): boolean => {
    return item.conceptSet != undefined && item.conceptSet != '';
  };

  // Verifica se l'elemento fornito è un concetto lessicale
  isLexicalConcept = (item: any): boolean => {
    return item.lexicalConcept != undefined && item.lexicalConcept != '';
  };

  // Gestisce lo spostamento di un nodo all'interno dell'albero
  onMoveNode($event) {
    console.log($event);

    if ($event != undefined) {
      // Definisce i parametri iniziali vuoti
      let parameters = {};

      // Recupera il concetto lessicale del nodo genitore da cui si sposta il nodo
      let node_parent = $event.from.parent.lexicalConcept;

      // Recupera il concetto lessicale del nodo spostato e del nodo di destinazione
      let node_source = $event.node.lexicalConcept;
      let node_target = $event.to.parent.lexicalConcept;

      // Se il nodo genitore esiste, prepara i parametri per aggiornare la relazione semantica
      if (node_parent && node_parent != '') {
        parameters = {
          relation: 'http://www.w3.org/2004/02/skos/core#narrower',
          source: node_source,
          target: node_target,
          oldTarget: node_parent,
        };
      } else {
        parameters = {
          relation: 'http://www.w3.org/2004/02/skos/core#narrower',
          source: node_source,
          target: node_target,
        };
      }

      // Se il nodo di destinazione è definito, aggiorna la relazione semantica
      if (node_target != undefined) {
        this.conceptService
          .updateSemanticRelation(parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (next) => {
              console.log(next);
            },
            (error) => {
              console.log(error);
              if (error.status == 200) {
                this.toastr.success('Concetto lessicale spostato', '', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.error(error.error, '', { timeOut: 5000 });
              }
            },
            () => {
              console.log('completato');
            }
          );
      } else {
        let from_node = $event.from.parent.lexicalConcept;

        let parameters = {
          relation: 'http://www.w3.org/2004/02/skos/core#narrower',
          value: from_node,
        };

        // Se il nodo da cui si sposta è definito, elimina la relazione
        if (from_node != undefined) {
          this.conceptService
            .deleteRelation(node_source, parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                console.log(data);
                this.toastr.success('Concetto lessicale spostato', '', {
                  timeOut: 5000,
                });
              },
              (error) => {
                console.log(error);
                if (error.status == 200) {
                  this.toastr.success('Concetto lessicale spostato', '', {
                    timeOut: 5000,
                  });
                } else {
                  this.toastr.error(
                    'Errore nello spostamento del concetto lessicale'
                  );
                }
              }
            );
        }
      }
    }
  }

  // Carica l'albero dei concetti lessicali
  async loadTree() {
    let conceptSets = [];
    let rootConceptSets = [];
    let tmp = [];

    try {
      // Ottiene i concetti lessicali radice
      rootConceptSets = await this.conceptService
        .getRootLexicalConcepts()
        .toPromise()
        .then((response) => response.list);
    } catch (error) {
      console.log(error);
    }

    // Se esistono concetti radice e non sono stati già caricati, prepara i nodi dell'albero
    if (rootConceptSets.length > 0 && conceptSets.length == 0) {
      rootConceptSets.map((element) => {
        (element['hasChildren'] = true),  (element['children_count'] = element.children), (element['children'] = undefined);
      });

      this.skos_nodes = rootConceptSets;
    }

    // Imposta il contatore dei nodi SKOS
    this.counter = this.skos_nodes.length;
  }

  // Pulisce le risorse quando il componente viene distrutto
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  // Gestisce lo scorrimento verso il basso nel modello dell'albero
  onScrollDown(treeModel: TreeModel) {
    // Incrementa l'offset di 500 per il caricamento progressivo
    this.offset += 500;
    // Imposta la visualizzazione del modale a vero
    this.modalShow = true;

    // Mostra il modale per il caricamento pigro
    //@ts-ignore
    $('#lazyLoadingModal').modal('show');
    // Appende il backdrop del modale all'elemento con classe 'tree-view'
    $('.modal-backdrop').appendTo('.tree-view');
    // Rimuove la classe "modal-open" dal body
    $('body').removeClass('modal-open');
    // Resetta il padding-right del body
    $('body').css('padding-right', '');

    // Prepara i parametri per il filtraggio, includendo i nuovi offset e limit
    let parameters = this.skosFilterForm.value;
    parameters['offset'] = this.offset;
    parameters['limit'] = this.limit;
  }

  // Aggiorna la vista dell'albero
  updateTreeView() {
    // Imposta un ritardo prima di aggiornare il contatore e richiamare sizeChanged sull'albero
    setTimeout(() => {
      // Aggiorna il contatore con il numero di nodi skos
      this.counter = this.skos_nodes.length;
      // Notifica al componente dell'albero che la sua dimensione è cambiata
      this.skosTree.sizeChanged();
    }, 1000);
  }

  // Reimposta i campi ai valori iniziali
  resetFields() {
    // Reimposta il formulario di filtro skos ai valori iniziali senza emettere eventi
    this.skosFilterForm.reset(this.initialValues, { emitEvent: false });
    // Dopo un ritardo, ricarica l'albero e aggiorna la vista
    setTimeout(() => {
      // Carica l'albero
      this.loadTree();
      // Aggiorna il modello dell'albero
      this.skosTree.treeModel.update();
      // Aggiorna la vista dell'albero
      this.updateTreeView();
    }, 500);
  }

  // Filtra i nodi basati sui parametri di ricerca
  searchFilter(newPar) {
    // Resetta i nodi skos
    this.skos_nodes = [];

    // Dopo un ritardo, azzera lo scroll della viewport
    setTimeout(() => {
      // Seleziona l'elemento viewport dell'albero e azzera lo scroll
      const viewPort_prova = this.element.nativeElement.querySelector(
        'tree-viewport'
      ) as HTMLElement;
      viewPort_prova.scrollTop = 0;
    }, 300);

    // Prepara il testo di ricerca
    let search_text = newPar.search_text != null ? newPar.search_text : '';
    // Attiva l'icona di caricamento della ricerca
    this.searchIconSpinner = true;
    // Prepara i parametri per il servizio di filtraggio
    let parameters = {
      text: search_text,
      searchMode: newPar.search_mode,
      labelType: 'prefLabel',
      author: '',
      offset: 0,
      limit: 500,
    };

    // Esegue il filtraggio dei concetti con i parametri specificati
    this.conceptService
      .conceptFilter(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Gestisce i dati ricevuti in risposta
          console.log(data);

          // Se la lista dei risultati è non vuota, filtra e aggiorna i nodi skos
          if (data.list.length > 0) {
            let filter_lang = [];
            // Filtra gli elementi con lingua non nulla
            filter_lang = data.list.filter(
              (element) => element.language != 'null'
            );

            // Per ogni elemento filtrato, imposta hasChildren a vero e children a undefined
            filter_lang.forEach((el) => {
              el['hasChildren'] = true;
              el['children'] = undefined;
            });

            // Logga i risultati filtrati
            console.log(filter_lang);
            // Aggiorna i nodi skos con i risultati filtrati
            this.skos_nodes = filter_lang;
          } else {
            // Se non ci sono risultati, resetta i nodi skos
            this.skos_nodes = [];
          }
        },
        (error) => {
          // Gestisce eventuali errori nella richiesta
          console.log(error);
        }
      );

    // Disattiva l'icona di caricamento della ricerca
    this.searchIconSpinner = false;
  }

  // Funzione asincrona che recupera i nodi figli di un nodo specificato.
  async getChildren(node: any) {
    let newNodes: any;
    // Controlla se il nodo ha un conceptSet o un lexicalConcept definito.
    if (
      node.data.conceptSet != undefined ||
      node.data.lexicalConcept != undefined
    ) {
      try {
        // Determina l'istanza corretta da utilizzare (conceptSet o lexicalConcept).
        let instance =
          node.data.conceptSet != undefined
            ? node.data.conceptSet
            : node.data.lexicalConcept;

        // Richiede asincronamente i concetti lessicali e attende la risposta.
        let data = await this.conceptService
          .getLexicalConcepts(instance)
          .toPromise();
        console.log(data);

        // Mappa i dati ricevuti in nuovi nodi.
        newNodes = data['list'].map((c) => Object.assign({}, c));

        // Se ci sono nuovi nodi, imposta per ciascuno la proprietà 'children' come undefined e 'hasChildren' come true.
        if (Object.keys(newNodes).length > 0) {
          for (const element of newNodes) {
            element['children'] = undefined;
            element['hasChildren'] = true;
          }
          // Restituisce i nuovi nodi.
          return newNodes;
        } else {
          // Se non ci sono figli, mostra un messaggio informativo.
          this.toastr.info('No childs for this node', 'Info', {
            timeOut: 5000,
          });

          // Restituisce comunque i nuovi nodi (vuoti).
          return newNodes;
        }
      } catch (error) {
        console.log(error);
        // In caso di errore non riconducibile a una risposta HTTP 200, mostra un messaggio di errore.
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

  // Funzione che processa la richiesta dell'utente in base alla selezione "uno o tutti".
  processRequest() {
    let request = this.processRequestForm.get('oneOrAll').value;
    // Se la richiesta è per un singolo elemento, chiama la funzione per eliminare un concetto lessicale specifico.
    if (request == 'one') {
      this.deleteLexicalConcept(this.nodeToRemove, true);
    } else {
      // Se la richiesta è per tutti gli elementi, chiama la funzione per eliminare ricorsivamente i concetti lessicali.
      this.deleteLexicalConceptRecursive(this.nodeToRemove);
      return;
    }
  }

  // Funzione che elimina ricorsivamente un concetto lessicale e tutti i suoi figli.
  deleteLexicalConceptRecursive(item) {
    let lexicalConceptID = item.lexicalConcept;
    this.searchIconSpinner = true;

    // Chiama il servizio per eliminare il concetto lessicale specificato e sottoscrive il risultato.
    this.conceptService
      .deleteLexicalConcept(lexicalConceptID, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
        },
        (error) => {
          console.log(error);
          // Gestisce gli errori e i successi mostrando messaggi appropriati.
          if (error.status != 200) {
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          } else {
            this.toastr.success(
              lexicalConceptID + ' and all his children deleted correctly',
              '',
              {
                timeOut: 5000,
              }
            );
            this.searchIconSpinner = false;
            // Esegue le operazioni di pulizia dopo l'eliminazione.
            this.conceptService.deleteRequest(item);
            this.lexicalService.sendToCoreTab(null);
            this.lexicalService.sendToRightTab(null);
            this.biblioService.sendDataToBibliographyPanel(null);

            this.expander.expandCollapseEdit(false);
            this.expander.openCollapseEdit(false);
            if (this.expander.isEpigraphyOpen) {
              this.expander.expandCollapseEpigraphy();
            }
            this.nodeToRemove = null;
          }
        }
      );
  }

  // Funzione che elimina un concetto lessicale. Se 'force' non è definito e il nodo ha figli, mostra un modale per la conferma.
  deleteLexicalConcept(item, force?) {
    let lexicalConceptID = item.lexicalConcept;
    this.searchIconSpinner = true;

    // Gestisce la logica per i nodi con figli, senza figli, o quando la forzatura è specificata.
    if (
      item.children != undefined &&
      item.children.length > 0 &&
      force == undefined
    ) {
      this.nodeToRemove = item;
      setTimeout(() => {
        this.modalService.open(this.lexicalConceptRemoverModal, {
          centered: true,
        });
      }, 1000);
    } else if (item.children == undefined && force == undefined) {
      this.conceptService
        .getLexicalConcepts(lexicalConceptID)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);

            if (data != undefined) {
              if (data.list.length > 0) {
                this.nodeToRemove = item;
                setTimeout(() => {
                  this.modalService.open(this.lexicalConceptRemoverModal, {
                    centered: true,
                  });
                }, 100);
              } else {
                // Se il nodo non ha figli, procede con l'eliminazione diretta.
                this.conceptService
                  .deleteLexicalConcept(lexicalConceptID)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe(
                    (data) => {
                      console.log(data);
                    },
                    (error) => {
                      console.log(error);
                      // Gestisce gli errori e i successi durante l'eliminazione.
                      if (error.status != 200) {
                        this.toastr.error(error.error, 'Error', {
                          timeOut: 5000,
                        });
                      } else {
                        this.toastr.success(
                          lexicalConceptID + 'deleted correctly',
                          '',
                          {
                            timeOut: 5000,
                          }
                        );
                        this.searchIconSpinner = false;
                        // Esegue le operazioni di pulizia dopo l'eliminazione.
                        this.conceptService.deleteRequest(item);
                        this.lexicalService.sendToCoreTab(null);
                        this.lexicalService.sendToRightTab(null);
                        this.biblioService.sendDataToBibliographyPanel(null);

                        this.expander.expandCollapseEdit(false);
                        this.expander.openCollapseEdit(false);
                        if (this.expander.isEpigraphyOpen) {
                          this.expander.expandCollapseEpigraphy();
                        }
                      }
                    }
                  );
              }
            }
          },
          (error) => {
            console.log(error);
            if (error.status == 200) {
              setTimeout(() => {
                this.modalService.open(this.lexicalConceptRemoverModal, {
                  centered: true,
                });
              }, 100);
            } else {
              this.toastr.error(error.error, 'Error', { timeOut: 5000 });
            }
          }
        );
    } else {
      // Procede con l'eliminazione diretta se 'force' è specificato o se non ci sono condizioni che impediscono l'eliminazione.
      this.conceptService
        .deleteLexicalConcept(lexicalConceptID)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
          },
          (error) => {
            console.log(error);
            if (error.status != 200) {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            } else {
              this.toastr.success(lexicalConceptID + 'deleted correctly', '', {
                timeOut: 5000,
              });
              this.searchIconSpinner = false;
              // Esegue le operazioni di pulizia dopo l'eliminazione.
              this.conceptService.deleteRequest(item);
              this.lexicalService.sendToCoreTab(null);
              this.lexicalService.sendToRightTab(null);
              this.biblioService.sendDataToBibliographyPanel(null);

              this.expander.expandCollapseEdit(false);
              this.expander.openCollapseEdit(false);
              if (this.expander.isEpigraphyOpen) {
                this.expander.expandCollapseEpigraphy();
              }
            }
          }
        );
    }
  }

  // Funzione per eliminare un nodo dall'albero SKOS in base ad un segnale specificato
  skosDeleteRequest(signal?) {
    // Itera attraverso i nodi dell'albero per trovare un match con il segnale
    this.skosTree.treeModel.getNodeBy((x) => {
      // Controlla se è stato specificato un conceptSet ma non un lexicalConcept
      if (
        signal.conceptSet != undefined &&
        signal.lexicalConcept == undefined
      ) {
        // Se il nodo corrente corrisponde al conceptSet specificato
        if (x.data.conceptSet === signal.conceptSet) {
          // Rimuove il nodo dall'array di figli del suo genitore
          x.parent.data.children.splice(
            x.parent.data.children.indexOf(x.data),
            1
          );
          // Aggiorna l'albero per riflettere la modifica
          this.skosTree.treeModel.update();
          // Aggiorna il contatore dei nodi dopo un ritardo per assicurare che l'albero sia aggiornato
          setTimeout(() => {
            this.counter = this.skosTree.treeModel.nodes.length;
          }, 1000);
          // Indica che il nodo corrispondente è stato trovato e gestito
          return true;
        } else {
          // Il nodo corrente non corrisponde al criterio
          return false;
        }
      } else if (signal.lexicalConcept != undefined) {
        // Se è stato specificato un lexicalConcept
        if (x.data.lexicalConcept === signal.lexicalConcept) {
          // Rimuove il nodo dall'array di figli del suo genitore
          x.parent.data.children.splice(
            x.parent.data.children.indexOf(x.data),
            1
          );
          // Aggiorna l'albero per riflettere la modifica
          this.skosTree.treeModel.update();
          // Aggiorna il contatore dei nodi dopo un ritardo per assicurare che l'albero sia aggiornato
          setTimeout(() => {
            this.counter = this.skosTree.treeModel.nodes.length;
          }, 1000);
          // Indica che il nodo corrispondente è stato trovato e gestito
          return true;
        } else {
          // Il nodo corrente non corrisponde al criterio
          return false;
        }
      } else {
        // Non è stato specificato né un conceptSet né un lexicalConcept
        return false;
      }
    });
  }

  // Funzione per aggiungere un sottonodo a un nodo esistente nell'albero SKOS in base ad un segnale specificato
  addSubElement(signal?) {
    // Ritarda l'esecuzione per assicurare che l'albero sia pronto
    setTimeout(() => {
      let instanceName;
      let lex = signal.lex;
      let data = signal.data;
      console.log(lex); // Stampa il valore di 'lex' per debug
      console.log(data); // Stampa il valore di 'data' per debug

      // Itera attraverso i nodi dell'albero per trovare un match con 'lex'
      this.skosTree.treeModel.getNodeBy((x) => {
        // Controlla se il nodo corrente corrisponde al lexicalConcept specificato in 'lex'
        if (lex.lexicalConcept != undefined) {
          if (x.data.lexicalConcept === lex.lexicalConcept) {
            // Se il nodo corrente non ha figli, inizializza l'array e aggiunge il nuovo nodo
            if (x.data.children == undefined) {
              x.data.children = [];
              x.data.children.push(data);
              x.expand(); // Espande il nodo per mostrare il nuovo sottonodo
              // Aggiorna l'albero per riflettere la modifica
              this.skosTree.treeModel.update();
              // Ricerca e attiva il nuovo nodo aggiunto
              this.skosTree.treeModel.getNodeBy((y) => {
                if (
                  y.data.lexicalConcept != undefined &&
                  y.data.lexicalConcept === data.lexicalConcept
                ) {
                  y.setActiveAndVisible();
                }
              });
              return true;
            } else {
              // Se il nodo corrente ha già figli, aggiunge il nuovo nodo all'array
              x.data.children.push(data);
              x.expand(); // Espande il nodo per mostrare il nuovo sottonodo
              // Aggiorna l'albero per riflettere la modifica
              this.skosTree.treeModel.update();
              // Ricerca e attiva il nuovo nodo aggiunto
              this.skosTree.treeModel.getNodeBy((y) => {
                if (
                  y.data.lexicalConcept != undefined &&
                  y.data.lexicalConcept === data.lexicalConcept
                ) {
                  y.setActiveAndVisible();
                }
              });
              return true;
            }
          } else {
            // Il nodo corrente non corrisponde al criterio
            return false;
          }
        } else {
          // Non è stato specificato un lexicalConcept
          return false;
        }
      });
    }, 300);
  }

  // Aggiunge un concetto lessicale al nodo genitore specificato, stabilendo una relazione tra i due.
  addLexicalConcept(parentNode: any, type: string) {
    // Controlla se il nodo genitore esiste
    if (parentNode) {
      // Imposta la relazione come "più stretto"
      let relation = 'http://www.w3.org/2004/02/skos/core#narrower';

      // Crea un nuovo concetto lessicale e si iscrive al risultato
      this.conceptService
        .createNewLexicalConcept()
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Se il dato ricevuto non è undefined
            if (data != undefined) {
              // Codice commentato relativo alla visualizzazione di una notifica

              // Imposta i parametri per l'aggiornamento della proprietà dello schema o della relazione semantica
              let parameters = {
                relation: relation,
                source: data['lexicalConcept'],
                target: parentNode['lexicalConcept'],
              };

              // Indica che il nuovo concetto ha figli
              data['hasChildren'] = true;

              // Se il tipo è "conceptSet", aggiorna la proprietà dello schema
              if (type == 'conceptSet') {
                this.conceptService
                  .updateSchemeProperty(parameters)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe(
                    (data) => {
                      // Gestione del successo della chiamata
                    },
                    (error) => {
                      // Gestione dell'errore della chiamata
                      // Se lo stato dell'errore è 200, si procede ad aggiungere il concetto al nodo genitore
                      if (error.status == 200) {
                        // Se il nodo genitore non ha figli, inizializza l'array dei figli
                        if (parentNode.children == undefined)
                          parentNode.children = [];
                        // Aggiunge il concetto ai figli del nodo genitore
                        parentNode.children.push(data);
                        // Visualizza una notifica di successo
                        this.toastr.success('Added Lexical Concept', '', {
                          timeOut: 5000,
                        });
                        // Aggiorna il modello dell'albero e imposta il nodo come attivo e visibile
                        this.skosTree.treeModel.update();
                        this.skosTree.treeModel.getNodeBy((y) => {
                          // Cerca il nodo aggiunto nell'albero per impostarlo come attivo e visibile
                          if (y.data.lexicalConcept != undefined) {
                            if (y.data.lexicalConcept === data.lexicalConcept) {
                              y.setActiveAndVisible();
                              return true;
                            } else {
                              return false;
                            }
                          } else {
                            return false;
                          }
                        });
                        // Aggiorna il contatore dei nodi dopo un ritardo per assicurare l'aggiornamento dell'albero
                        setTimeout(() => {
                          this.counter = this.skosTree.treeModel.nodes.length;
                        }, 1000);
                      }
                    }
                  );
              } else {
                // Se il tipo non è "conceptSet", aggiorna la relazione semantica con lo stesso procedimento di sopra
                this.conceptService
                  .updateSemanticRelation(parameters)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe(
                    (data) => {
                      // Gestione del successo della chiamata
                    },
                    (error) => {
                      // Gestione dell'errore della chiamata e procedura analoga a quella descritta sopra
                      if (error.status == 200) {
                        if (parentNode.children == undefined)
                          parentNode.children = [];
                        parentNode.children.push(data);
                        this.toastr.success('Added Lexical Concept', '', {
                          timeOut: 5000,
                        });
                        this.skosTree.treeModel.update();
                        this.skosTree.treeModel.getNodeBy((y) => {
                          if (y.data.lexicalConcept != undefined) {
                            if (y.data.lexicalConcept === data.lexicalConcept) {
                              y.setActiveAndVisible();
                              return true;
                            } else {
                              return false;
                            }
                          } else {
                            return false;
                          }
                        });
                        setTimeout(() => {
                          this.counter = this.skosTree.treeModel.nodes.length;
                        }, 1000);
                      }
                    }
                  );
              }
            }
          },
          (error) => {
            // Gestione dell'errore nella creazione del nuovo concetto
            this.toastr.error('Error when creating new Concept Set', '', {
              timeOut: 5000,
            });
          }
        );
    }
  }

  // Crea un nuovo set di concetti e lo aggiunge all'albero SKOS
  addNewConceptSet() {
    // Crea un nuovo set di concetti e si iscrive al risultato
    this.conceptService
      .createNewConceptSet()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Se il dato ricevuto non è undefined
          if (data != undefined) {
            // Visualizza una notifica informativa
            this.toastr.info('New Concept Set added', '', {
              timeOut: 5000,
            });
            // Indica che il nuovo set di concetti ha figli
            data['hasChildren'] = true;
            // Aggiunge il set di concetti ai nodi SKOS
            this.skos_nodes.push(data);
            // Aggiorna la vista dell'albero e imposta il nodo come attivo e visibile
            this.updateTreeView();
            this.skosTree.treeModel.update();
            this.skosTree.treeModel.getNodeById(data.id).setActiveAndVisible();
          }
        },
        (error) => {
          // Gestione dell'errore nella creazione del nuovo set di concetti
          this.toastr.error('Error when creating new Concept Set', '', {
            timeOut: 5000,
          });
        }
      );
  }
}
