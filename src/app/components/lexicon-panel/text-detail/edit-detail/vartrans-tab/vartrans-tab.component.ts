﻿/*
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
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

import {
  animate,
  style,
  transition,
  trigger,
  state,
} from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-vartrans-tab',
  templateUrl: './vartrans-tab.component.html',
  styleUrls: ['./vartrans-tab.component.scss'],
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
export class VartransTabComponent implements OnInit, OnDestroy {
  lock = 0;
  object: any;
  exp_trig = '';

  lexicalEntryData: any;
  senseData: any;

  isLexicalEntry = false;
  isSense = false;

  expand_edit_subscription: Subscription;
  expand_epi_subscription: Subscription;
  @ViewChild('expander') expander_body: ElementRef;

  constructor(
    private lexicalService: LexicalEntriesService,
    private expand: ExpanderService,
    private rend: Renderer2
  ) {}

  ngOnInit(): void {
    // Sottoscrivi all'observable per l'espansione dell'editor
    this.expand_edit_subscription = this.expand.expEdit$.subscribe(
      (trigger) => {
        if (trigger) {
          // Controlla se il tab di modifica è espanso
          let isEditExpanded = this.expand.isEditTabExpanded();
          // Controlla se il tab epigrafico è espanso
          let isEpigraphyExpanded = this.expand.isEpigraphyTabExpanded();

          // Se il tab epigrafico non è espanso
          if (!isEpigraphyExpanded) {
            this.exp_trig = 'in';
            // Imposta l'altezza massima e minima del corpo espanso
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
            // Se il tab epigrafico è espanso
            // Imposta l'altezza massima e minima del corpo espanso
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
          // Se il trigger è nullo, esci
          return;
        } else {
          // Se il trigger è falso
          // Imposta l'altezza massima e minima del corpo espanso
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
      }
    );

    // Sottoscrivi all'observable per l'espansione dell'epigrafia
    this.expand_epi_subscription = this.expand.expEpigraphy$.subscribe(
      (trigger) => {
        setTimeout(() => {
          if (trigger) {
            // Se il trigger è vero
            this.exp_trig = 'in';
            // Imposta l'altezza massima e minima del corpo espanso
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
            // Se il trigger è nullo, esci
            return;
          } else {
            // Se il trigger è falso
            // Imposta l'altezza massima del corpo espanso
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

  // Funzione per cambiare lo stato del blocco
  changeStatus() {
    if (this.lock < 2) {
      // Se il blocco è inferiore a 2, incrementa
      this.lock++;
    } else if (this.lock > 1) {
      // Se il blocco è maggiore di 1, decrementa
      this.lock--;
    }
    // Attiva il tooltip dopo un breve ritardo
    setTimeout(() => {
      //@ts-ignore
      $('.locked-tooltip').tooltip({
        trigger: 'hover', // Mostra il tooltip al passaggio del mouse
      });
    }, 10);
  }

  ngOnDestroy(): void {
    // Annulla la sottoscrizione agli observable per evitare memory leaks
    this.expand_edit_subscription.unsubscribe();
    this.expand_epi_subscription.unsubscribe();
  }
}
