/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import * as Recogito from '@recogito/recogito-js';
import { Subscription } from 'rxjs';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';

@Component({
  selector: 'app-epigraphy-tab',
  templateUrl: './epigraphy-tab.component.html',
  styleUrls: ['./epigraphy-tab.component.scss'],
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
          height: 'calc(50vh - 10rem)',
        })
      ),
      transition('in => out', animate('400ms ease-in-out')),
      transition('out => in', animate('400ms ease-in-out')),
    ]),
  ],
})
export class EpigraphyTabComponent implements OnInit, OnDestroy {
  exp_trig = '';
  name: any;
  revisor: any;
  object: any;
  epigraphyData: any;

  subscription: Subscription;
  expand_epi_subscription: Subscription;
  expand_edit_subscription: Subscription;
  @ViewChild('expanderEpigraphy') expander_body: ElementRef;

  constructor(
    private documentService: DocumentSystemService,
    private expand: ExpanderService,
    private rend: Renderer2
  ) {}

  ngOnInit(): void {
    // Sottoscrizione al servizio per ottenere i dati epigrafici
    this.subscription = this.documentService.epigraphyData$.subscribe(
      (object) => {
        // Se l'oggetto ricevuto è diverso dall'oggetto attuale, reimposta i dati epigrafici a null
        if (this.object != object) {
          this.epigraphyData = null;
        }

        console.log(object); // Stampa l'oggetto ricevuto a fini di debug

        // Se l'oggetto non è nullo
        if (object != null) {
          this.object = object; // Imposta l'oggetto corrente con l'oggetto ricevuto
          this.name = this.object.fileId; // Imposta il nome utilizzando l'ID del file nell'oggetto

          this.epigraphyData = this.object; // Imposta i dati epigrafici con l'oggetto ricevuto
          if (this.object != null) {
            // Se l'oggetto non è nullo
            setTimeout(() => {
              // Nasconde il modal dopo un intervallo di tempo
              //@ts-ignore
              $('#epigraphyTabModal').modal('hide'); // Nasconde il modal utilizzando jQuery
              $('.modal-backdrop').remove(); // Rimuove il backdrop del modal
              var timer = setInterval((val) => {
                try {
                  //@ts-ignore
                  $('#epigraphyTabModal').modal('hide'); // Nasconde il modal
                  if (!$('#epigraphyTabModal').is(':visible')) {
                    // Se il modal non è visibile
                    clearInterval(timer); // Interrompe l'intervallo
                  }
                } catch (e) {
                  console.log(e); // Gestione degli errori
                }
              }, 10);
            }, 500);
          }
        } else {
          this.epigraphyData = null; // Se l'oggetto è nullo, reimposta i dati epigrafici a null
        }
      },
      (error) => {} // Gestione degli errori durante la sottoscrizione
    );

    // Sottoscrizione all'espansione dell'epigrafia
    this.expand_epi_subscription = this.expand.expEpigraphy$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
            // Se è stato attivato il trigger di espansione
            let isEditExpanded = this.expand.isEditTabExpanded(); // Verifica se la scheda di modifica è espansa
            let isEpigraphyExpanded = this.expand.isEpigraphyTabExpanded(); // Verifica se la scheda epigrafica è espansa

            if (!isEditExpanded) {
              // Se la scheda di modifica non è espansa
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'height',
                'calc(100vh - 17rem)'
              ); // Imposta l'altezza del corpo espandibile
              this.exp_trig = 'in'; // Imposta il trigger di espansione
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'max-height',
                'calc(100vh - 17rem)'
              ); // Imposta l'altezza massima del corpo espandibile
            } else {
              // Se la scheda di modifica è espansa
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'height',
                'calc(50vh - 10rem)'
              ); // Imposta l'altezza del corpo espandibile
              this.exp_trig = 'in'; // Imposta il trigger di espansione
              this.rend.setStyle(
                this.expander_body.nativeElement,
                'max-height',
                'calc(50vh - 10rem)'
              ); // Imposta l'altezza massima del corpo espandibile
            }
          } else if (trigger == null) {
            return; // Se il trigger è nullo, esce dalla funzione
          } else {
            // Se è stato attivato il trigger di chiusura
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'height',
              'calc(50vh - 10rem)'
            ); // Imposta l'altezza del corpo espandibile
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'max-height',
              'calc(50vh - 10rem)'
            ); // Imposta l'altezza massima del corpo espandibile
            this.exp_trig = 'out'; // Imposta il trigger di chiusura
          }
        }, 100);
      }
    );

    // Sottoscrizione all'espansione della modifica
    this.expand_edit_subscription = this.expand.expEdit$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
            // Se è stato attivato il trigger di espansione
            this.exp_trig = 'in'; // Imposta il trigger di espansione
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'height',
              'calc(50vh - 10rem)'
            ); // Imposta l'altezza del corpo espandibile
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'max-height',
              'calc(50vh - 10rem)'
            ); // Imposta l'altezza massima del corpo espandibile
          } else if (trigger == null) {
            return; // Se il trigger è nullo, esce dalla funzione
          } else {
            // Se è stato attivato il trigger di chiusura
            this.rend.setStyle(
              this.expander_body.nativeElement,
              'max-height',
              'calc(50vh - 10rem)'
            ); // Imposta l'altezza massima del corpo espandibile
            this.exp_trig = 'out'; // Imposta il trigger di chiusura
          }
        }, 100);
      }
    );
  }

  ngOnDestroy(): void {
    // Cancella le sottoscrizioni per evitare memory leak
    this.subscription.unsubscribe(); // Cancella la sottoscrizione ai dati epigrafici
    this.expand_edit_subscription.unsubscribe(); // Cancella la sottoscrizione all'espansione della modifica
    this.expand_epi_subscription.unsubscribe(); // Cancella la sottoscrizione all'espansione dell'epigrafia
  }
}
