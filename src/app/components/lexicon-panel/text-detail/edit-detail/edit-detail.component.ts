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
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-edit-detail',
  templateUrl: './edit-detail.component.html',
  styleUrls: ['./edit-detail.component.scss'],
})
export class EditDetailComponent implements OnInit, OnDestroy {
  object: any;
  showTrigger = false;
  hideEtymology = true;
  hideDecomp = true;
  hideDictionary = true;
  @ViewChild('navtabs') navtabs: ElementRef;
  @ViewChild('navcontent') navcontent: ElementRef;

  expand_edit_subscription: Subscription;
  expand_epi_subscription: Subscription;
  core_data_subscription: Subscription;
  decomp_data_subscription: Subscription;
  etymology_data_subscription: Subscription;

  constructor(
    private lexicalService: LexicalEntriesService,
    private exp: ExpanderService
  ) {}

  /**
   * Questo metodo viene chiamato quando il componente viene inizializzato.
   * Inizializza le sottoscrizioni agli eventi per la visualizzazione e la modifica dei dati.
   */
  ngOnInit(): void {
    // Inizializzazione dell'oggetto a null
    this.object = null;

    // Sottoscrizione all'evento di apertura per la modifica dei dati
    this.expand_edit_subscription = this.exp.openEdit$.subscribe((boolean) => {
      if (boolean) {
        // Delay per consentire il rendering degli elementi prima della modifica
        setTimeout(() => {
          // Ricerca di tutti gli elementi con id 'text-dettaglio' e li espande
          var text_detail = document.querySelectorAll('#text-dettaglio');
          text_detail.forEach((element) => {
            if (!element.classList.contains('show')) {
              element.classList.add('show');
            }
          });

          // Ricerca degli elementi 'a' con attributo 'data-target' e rimuove la classe 'collapsed' se presente
          let a_link = document.querySelectorAll(
            'a[data-target="#text-dettaglio"]'
          );
          a_link.forEach((element) => {
            if (element.classList.contains('collapsed')) {
              element.classList.remove('collapsed');
            } else {
              //element.classList.add('collapsed')
            }
          });
        }, 100);
      }
    });

    // Sottoscrizione all'evento per i dati principali
    this.core_data_subscription = this.lexicalService.coreData$.subscribe(
      (object) => {
        if (object != null) {
          if (
            object['lexicalEntry'] != undefined ||
            object['form'] != undefined ||
            object['sense'] != undefined ||
            object['etymology'] != undefined ||
            object['conceptSet'] != undefined ||
            object['lexicalConcept'] != undefined
          ) {
            setTimeout(() => {
              // Ricerca degli elementi 'a' all'interno di 'navtabs' e gestione della visualizzazione dei dati
              var navTabLinks =
                this.navtabs.nativeElement.querySelectorAll('a');
              this.object = object;
              navTabLinks.forEach((element) => {
                if (element.text == 'Core') {
                  element.classList.add('active');
                  this.hideDecomp = true;
                  this.hideEtymology = true;
                } else {
                  element.classList.remove('active');
                  //console.log(element.id)
                }
              });

              // Ricerca degli elementi '.tab-pane' all'interno di 'navcontent' e gestione della visualizzazione dei dati
              var navContent =
                this.navcontent.nativeElement.querySelectorAll('.tab-pane');
              navContent.forEach((element) => {
                if (element.id == 'core') {
                  element.classList.add('active');
                  element.classList.add('show');
                  /* console.log("picchio");
                  console.log(element) */
                } else {
                  element.classList.remove('active');
                  element.classList.remove('show');
                  /* console.log("picchio21")
                  console.log(element) */
                }
              });
            }, 100);
          } else {
            this.object = null;
          }
        }
      }
    );

    // Sottoscrizione all'evento per i dati di decomposizione
    this.decomp_data_subscription = this.lexicalService.decompData$.subscribe(
      (object) => {
        if (object != null) {
          setTimeout(() => {
            // Ricerca degli elementi 'a' all'interno di 'navtabs' e gestione della visualizzazione dei dati
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a');
            this.object = object;
            navTabLinks.forEach((element) => {
              if (element.text == 'Decomposition') {
                element.classList.add('active');
                this.hideDecomp = false;
                this.hideEtymology = true;
              } else {
                element.classList.remove('active');
                //console.log(element.id)
              }
            });

            // Ricerca degli elementi '.tab-pane' all'interno di 'navcontent' e gestione della visualizzazione dei dati
            var navContent =
              this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            navContent.forEach((element) => {
              if (element.id == 'decomposition') {
                element.classList.add('active');
                element.classList.add('show');
                /* console.log("picchio");
              console.log(element) */
              } else {
                element.classList.remove('active');
                element.classList.remove('show');
                /* console.log("picchio21")
              console.log(element) */
              }
            });
          }, 100);
        } else {
          this.object = null;
        }
      }
    );

    // Sottoscrizione all'evento per i dati di etimologia
    this.etymology_data_subscription =
      this.lexicalService.etymologyData$.subscribe((object) => {
        if (object != null) {
          if (object['etymology']['etymology'] != undefined) {
            this.object = object;
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a');

            navTabLinks.forEach((element) => {
              //console.log(element.text)
              if (element.text == 'Etymology') {
                /* console.log("aggiungo active a:") */
                element.classList.add('active');
                this.hideEtymology = false;
                this.hideDecomp = true;
              } else {
                element.classList.remove('active');
                /* console.log("tolgo active a:") */
              }
            });

            // Ricerca degli elementi '.tab-pane' all'interno di 'navcontent' e gestione della visualizzazione dei dati
            var navContent =
              this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            navContent.forEach((element) => {
              //console.log(element.id)
              if (element.id == 'etymology') {
                element.classList.add('active');
                element.classList.add('show');
              } else {
                element.classList.remove('active');
                element.classList.remove('show');
                //console.log(element.id)
              }
            });
          } else {
            this.object = null;
          }
        }
      });
  }

  /**
   * Questo metodo è chiamato per triggerare l'espansione o la contrazione delle schede di modifica (edit) ed epigrafia (epigraphy).
   * Utilizza setTimeout per ritardare l'esecuzione delle operazioni di espansione o contrazione, garantendo che vengano eseguite dopo un breve intervallo di tempo.
   */
  triggerExpansionEdit() {
    setTimeout(() => {
      // Verifica se la scheda di modifica (edit) è aperta e la scheda di epigrafia è chiusa
      if (this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()) {
        // Verifica se la scheda di modifica (edit) è espansa e la scheda di epigrafia è chiusa
        if (
          this.exp.isEditTabExpanded() &&
          !this.exp.isEpigraphyTabExpanded()
        ) {
          // Contrai e poi espandi la scheda di modifica (edit)
          this.exp.openCollapseEdit();
          this.exp.expandCollapseEdit();
        }
      }
      // Verifica se entrambe le schede sono chiuse
      else if (!this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()) {
        // Verifica se nessuna delle schede è espansa
        if (
          !this.exp.isEditTabExpanded() &&
          !this.exp.isEpigraphyTabExpanded()
        ) {
          // Contrai e poi espandi la scheda di modifica (edit)
          this.exp.openCollapseEdit();
          this.exp.expandCollapseEdit();
        }
      }
      // Verifica se entrambe le schede sono aperte
      else if (this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()) {
        // Contrai la scheda di modifica (edit) e poi espandi la scheda di epigrafia
        this.exp.openCollapseEdit();
        this.exp.expandCollapseEpigraphy(true);
      }
      // Verifica se la scheda di modifica (edit) è chiusa e la scheda di epigrafia è aperta
      else if (!this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()) {
        // Verifica se la scheda di modifica (edit) non è espansa e la scheda di epigrafia è espansa
        if (
          !this.exp.isEditTabExpanded() &&
          this.exp.isEpigraphyTabExpanded()
        ) {
          // Contrai la scheda di epigrafia e poi espandi la scheda di modifica (edit)
          this.exp.expandCollapseEpigraphy(false);
          this.exp.openCollapseEdit(true);
        }
      }
    }, 200); // Ritardo di 200 millisecondi prima di eseguire le operazioni di espansione o contrazione
  }

  /**
   * Questo metodo viene chiamato quando il componente viene distrutto.
   * Si assicura di annullare tutte le sottoscrizioni ai servizi per evitare memory leak.
   */
  ngOnDestroy(): void {
    // Annulla la sottoscrizione ai dati principali
    this.core_data_subscription.unsubscribe();
    // Annulla la sottoscrizione ai dati di decomposizione
    this.decomp_data_subscription.unsubscribe();
    // Annulla la sottoscrizione ai dati di etimologia
    this.etymology_data_subscription.unsubscribe();
    // Annulla la sottoscrizione all'espansione della scheda di modifica (edit)
    this.expand_edit_subscription.unsubscribe();
  }
}
