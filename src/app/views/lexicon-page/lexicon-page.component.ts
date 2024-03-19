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
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-lexicon-page',
  templateUrl: './lexicon-page.component.html',
  styleUrls: ['./lexicon-page.component.scss'],
})
export class LexiconPageComponent implements OnInit, OnDestroy {
  subscription: Subscription;
  metadata_subscr: Subscription;
  object: any;
  @ViewChild('accordion') accordion: ElementRef;

  constructor(
    private documentService: DocumentSystemService,
    private lexicalService: LexicalEntriesService,
    private biblioService: BibliographyService
  ) {}

  notes = '';
  link = [];
  bibliography = [];
  attestation: any;
  metadata: any;

  note_panel_subscription: Subscription;
  trigger_att_panel_subscription: Subscription;
  trigger_biblio_panel_subscription: Subscription;
  attestation_panel_subscription: Subscription;
  medatata_panel_subscription: Subscription;
  trigger_metatada_panel_subscription: Subscription;
  right_panel_subscription: Subscription;

  ngOnInit(): void {
    // Sottoscrivi alla modifica del pannello delle note
    this.note_panel_subscription =
      this.lexicalService.triggerNotePanel$.subscribe((boolean) => {
        // Aspetta un breve periodo prima di eseguire le operazioni
        setTimeout(() => {
          // Controlla se il valore booleano non è nullo
          if (boolean != null) {
            // Se il valore booleano è vero, esegui le operazioni seguenti
            if (boolean) {
              // Seleziona il link dell'accordion e il container del collapsible delle note
              let a_link = this.accordion.nativeElement.querySelectorAll(
                'a[data-target="#noteCollapse"]'
              );
              let collapse_container =
                this.accordion.nativeElement.querySelectorAll(
                  'div[aria-labelledby="noteHeading"]'
                );
              // Seleziona tutti gli elementi che hanno un ID che inizia con "collapse-"
              let item_collapse =
                this.accordion.nativeElement.querySelectorAll(
                  '[id^="collapse-"]'
                );
              // Itera su tutti i link dell'accordion
              a_link.forEach((element) => {
                // Controlla se il link è già espanso
                if (element.classList.contains('collapsed')) {
                  // Rimuovi la classe "collapsed" se presente
                  element.classList.remove('collapsed');
                } else {
                  // Non effettuare alcuna operazione se il link non è espanso
                }
              });

              // Itera su tutti i container del collapsible delle note
              collapse_container.forEach((element) => {
                // Controlla se il container è già visualizzato
                if (element.classList.contains('show')) {
                  // Non effettuare alcuna operazione se il container è già visualizzato
                } else {
                  // Aggiungi la classe "show" per visualizzare il container
                  element.classList.add('show');
                }
              });

              // Itera su tutti gli elementi con ID che inizia con "collapse-"
              item_collapse.forEach((element) => {
                // Controlla se l'elemento è l'ultimo elemento della lista
                if (element == item_collapse[item_collapse.length - 1]) {
                  // Aggiungi la classe "show" se l'elemento è l'ultimo della lista
                  element.classList.add('show');
                } else {
                  // Rimuovi la classe "show" se l'elemento non è l'ultimo della lista
                  element.classList.remove('show');
                }
              });
            } else {
              // Se il valore booleano è falso, esegui le operazioni seguenti
              setTimeout(() => {
                // Seleziona tutti i link dell'accordion e aggiungi la classe "collapsed"
                let a_link = this.accordion.nativeElement.querySelectorAll(
                  'a[data-target="#noteCollapse"]'
                );
                a_link.forEach((element) => {
                  element.classList.add('collapsed');
                });

                // Seleziona tutti i container del collapsible delle note e rimuovi la classe "show"
                let collapse_container =
                  this.accordion.nativeElement.querySelectorAll(
                    'div[aria-labelledby="noteHeading"]'
                  );
                collapse_container.forEach((element) => {
                  if (element.classList.contains('show')) {
                    element.classList.remove('show');
                  }
                });
              }, 100);
            }
          }
        }, 100);
      });

    // Sottoscrizione per attivare il pannello di attestazione
    this.trigger_att_panel_subscription =
      this.lexicalService.triggerAttestationPanel$.subscribe((boolean) => {
        // Utilizza setTimeout per ritardare l'esecuzione delle operazioni
        setTimeout(() => {
          // Verifica se il valore booleano non è non definito
          if (boolean != undefined) {
            // Verifica se boolean è true
            if (boolean) {
              // Seleziona il link e il contenitore del collapse dell'attestazione
              let a_link = this.accordion.nativeElement.querySelectorAll(
                'a[data-target="#attestationCollapse"]'
              );
              let collapse_container =
                this.accordion.nativeElement.querySelectorAll(
                  'div[aria-labelledby="attestationHeading"]'
                );
              let item_collapse =
                this.accordion.nativeElement.querySelectorAll(
                  '[id^="collapse-"'
                );
              // Cicla su tutti i link
              a_link.forEach((element) => {
                // Verifica se il link ha la classe "collapsed"
                if (element.classList.contains('collapsed')) {
                  // Rimuove la classe "collapsed" se presente
                  element.classList.remove('collapsed');
                } else {
                  // Non fa nulla
                }
              });

              // Cicla su tutti i contenitori del collapse
              collapse_container.forEach((element) => {
                // Verifica se il contenitore ha la classe "show"
                if (element.classList.contains('show')) {
                  // Non fa nulla
                } else {
                  // Aggiunge la classe "show" al contenitore
                  element.classList.add('show');
                }
              });
            } else {
              // Se boolean è false
              setTimeout(() => {
                // Seleziona il link dell'attestazione
                let a_link = this.accordion.nativeElement.querySelectorAll(
                  'a[data-target="#attestationCollapse"]'
                );
                // Cicla su tutti i link
                a_link.forEach((element) => {
                  // Aggiunge la classe "collapsed" a tutti i link
                  element.classList.add('collapsed');
                });

                // Seleziona i contenitori del collapse
                let collapse_container =
                  this.accordion.nativeElement.querySelectorAll(
                    'div[aria-labelledby="attestationHeading"]'
                  );
                // Cicla su tutti i contenitori del collapse
                collapse_container.forEach((element) => {
                  // Verifica se il contenitore ha la classe "show"
                  if (element.classList.contains('show')) {
                    // Rimuove la classe "show" se presente
                    element.classList.remove('show');
                  }
                });
              }, 100);
            }
          }
        }, 100);
      });

    // Sottoscrizione per attivare il pannello della bibliografia
    this.trigger_biblio_panel_subscription =
      this.biblioService.triggerPanel$.subscribe((object) => {
        // Verifica se l'oggetto non è non definito
        if (object != undefined) {
          // Seleziona il link e il contenitore del collapse della bibliografia
          let a_link = this.accordion.nativeElement.querySelectorAll(
            'a[data-target="#bibliographyCollapse"]'
          );
          let collapse_container =
            this.accordion.nativeElement.querySelectorAll(
              'div[aria-labelledby="bibliographyHeading"]'
            );
          let item_collapse =
            this.accordion.nativeElement.querySelectorAll('[id^="collapse-"');
          // Cicla su tutti i link
          a_link.forEach((element) => {
            // Verifica se il link ha la classe "collapsed"
            if (element.classList.contains('collapsed')) {
              // Rimuove la classe "collapsed" se presente
              element.classList.remove('collapsed');
            } else {
              // Non fa nulla
            }
          });

          // Cicla su tutti i contenitori del collapse
          collapse_container.forEach((element) => {
            // Verifica se il contenitore ha la classe "show"
            if (element.classList.contains('show')) {
              // Non fa nulla
            } else {
              // Aggiunge la classe "show" al contenitore
              element.classList.add('show');
            }
          });

          // Cicla su tutti gli elementi del collapse
          item_collapse.forEach((element) => {
            // Verifica se l'elemento è l'ultimo nell'elenco
            if (element == item_collapse[item_collapse.length - 1]) {
              // Aggiunge la classe "show" all'ultimo elemento
              element.classList.add('show');
            } else {
              // Rimuove la classe "show" dagli altri elementi
              element.classList.remove('show');
            }
          });
        }
      });

    // Sottoscrizione per ricevere i dati del pannello di attestazione
    this.attestation_panel_subscription =
      this.lexicalService.attestationPanelData$.subscribe((data) => {
        // Verifica se i dati non sono nulli
        if (data != null) {
          // Verifica se i dati sono un array
          if (Array.isArray(data)) {
            // Assegna i dati all'array di attestazioni
            this.attestation = data;
          } else {
            // Assegna i dati in un array di attestazioni
            this.attestation = [data];
          }
        } else {
          // Assegna null all'array di attestazioni se i dati sono nulli
          this.attestation = null;
        }
      });

    // Sottoscrizione all'observable metadataData$ del servizio documentService
    this.medatata_panel_subscription =
      this.documentService.metadataData$.subscribe((data) => {
        console.log(data); // Stampa i dati ricevuti dall'observable
        // Controlla se i dati non sono nulli
        if (data != null) {
          this.metadata = data; // Assegna i dati alla variabile metadata
        } else {
          this.metadata = null; // Altrimenti assegna null a metadata
        }
      });

    // Sottoscrizione all'observable triggerMetadataPanel$ del servizio documentService
    this.trigger_metatada_panel_subscription =
      this.documentService.triggerMetadataPanel$.subscribe((boolean) => {
        // Imposta un ritardo prima di eseguire il codice seguente
        setTimeout(() => {
          console.log(boolean); // Stampa il valore booleano ricevuto dall'observable
          // Controlla se il valore booleano non è null
          if (boolean != null) {
            // Se il valore booleano è true
            if (boolean) {
              // Seleziona gli elementi HTML necessari tramite il selettore
              let a_link = this.accordion.nativeElement.querySelectorAll(
                'a[data-target="#metadataCollapse"]'
              );
              let collapse_container =
                this.accordion.nativeElement.querySelectorAll(
                  'div[aria-labelledby="metadataHeading"]'
                );
              let item_collapse =
                this.accordion.nativeElement.querySelectorAll(
                  '[id^="collapse-"'
                );
              // Itera sugli elementi a_link
              a_link.forEach((element) => {
                // Verifica se l'elemento ha la classe 'collapsed'
                if (element.classList.contains('collapsed')) {
                  element.classList.remove('collapsed'); // Rimuovi la classe 'collapsed'
                } else {
                  //element.classList.add('collapsed')
                }
              });

              // Itera sugli elementi collapse_container
              collapse_container.forEach((element) => {
                // Verifica se l'elemento ha la classe 'show'
                if (element.classList.contains('show')) {
                  //element.classList.remove('collapsed')
                } else {
                  element.classList.add('show'); // Aggiungi la classe 'show'
                }
              });

              // Itera sugli elementi item_collapse
              item_collapse.forEach((element) => {
                // Verifica se l'elemento è l'ultimo elemento di item_collapse
                if (element == item_collapse[item_collapse.length - 1]) {
                  element.classList.add('show'); // Aggiungi la classe 'show'
                } else {
                  element.classList.remove('show'); // Rimuovi la classe 'show'
                }
              });
            } else {
              // Se il valore booleano è false
              setTimeout(() => {
                // Seleziona gli elementi HTML necessari tramite il selettore
                let a_link = this.accordion.nativeElement.querySelectorAll(
                  'a[data-target="#metadataCollapse"]'
                );
                a_link.forEach((element) => {
                  element.classList.add('collapsed'); // Aggiungi la classe 'collapsed'
                });

                let collapse_container =
                  this.accordion.nativeElement.querySelectorAll(
                    'div[aria-labelledby="metadataHeading"]'
                  );
                collapse_container.forEach((element) => {
                  //console.log(element)
                  if (element.classList.contains('show')) {
                    element.classList.remove('show'); // Rimuovi la classe 'show'
                  }
                });
              }, 100);
            }
          }
        }, 100);
      });

    // Sottoscrizione all'observable rightPanelData$ del servizio lexicalService
    this.right_panel_subscription =
      this.lexicalService.rightPanelData$.subscribe((object) => {
        this.object = object; // Assegna l'oggetto ricevuto alla variabile object
        // Controlla se l'oggetto non è null
        if (this.object != null) {
          // Controlla se l'oggetto ha la proprietà 'etymology'
          if (this.object.etymology != undefined) {
            // Assegna i valori dell'oggetto alle rispettive variabili
            this.notes = this.object['etymology'];
            this.link = this.object['etymology'];
            this.bibliography = this.object['etymology'];
          } else {
            // Assegna i valori dell'oggetto alle rispettive variabili
            this.notes = this.object;
            this.link = this.object;
            this.bibliography = this.object;
          }
        } else {
          // Se l'oggetto è null, assegna null alle variabili
          this.notes = null;
          this.link = null;
          this.bibliography = null;
        }
      });
  }

  // Metodo chiamato quando il componente viene distrutto
  ngOnDestroy(): void {
    // Annulla tutte le sottoscrizioni agli observable per evitare memory leak
    this.medatata_panel_subscription.unsubscribe();
    this.note_panel_subscription.unsubscribe();
    this.trigger_biblio_panel_subscription.unsubscribe();
    this.trigger_att_panel_subscription.unsubscribe();
    this.medatata_panel_subscription.unsubscribe();
    this.attestation_panel_subscription.unsubscribe();
    this.trigger_metatada_panel_subscription.unsubscribe();
    this.right_panel_subscription.unsubscribe();
  }
}
