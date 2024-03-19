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
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';

@Component({
  selector: 'app-epigraphy-detail',
  templateUrl: './epigraphy-detail.component.html',
  styleUrls: ['./epigraphy-detail.component.scss'],
})
export class EpigraphyDetailComponent implements OnInit, OnDestroy {
  @ViewChild('navTabsEpigraphy') navtabs: ElementRef;
  @ViewChild('navContentEpigraphy') navcontent: ElementRef;

  object: any;
  subscription: Subscription;

  open_epigraphy_subscription: Subscription;
  constructor(
    private documentService: DocumentSystemService,
    private exp: ExpanderService
  ) {}

  /**
   * Questo metodo viene chiamato quando il componente viene inizializzato.
   * Si sottoscrive agli eventi relativi all'apertura della sezione epigrafica
   * e all'aggiornamento dei dati relativi all'epigrafia.
   * Si occupa di gestire la visualizzazione dei dettagli delle epigrafi e di
   * aggiornare la visualizzazione dei tab in base ai dati ricevuti.
   */
  ngOnInit(): void {
    // Sottoscrizione all'evento di apertura della sezione epigrafica
    this.open_epigraphy_subscription = this.exp.openEpigraphy$.subscribe(
      (boolean) => {
        if (boolean) {
          // Ritarda l'aggiornamento dei dettagli delle epigrafi per assicurarsi
          // che siano stati resi disponibili prima di eseguire l'operazione
          setTimeout(() => {
            // Seleziona tutti i dettagli dell'epigrafia e li mostra
            var text_detail = document.querySelectorAll('#epigraphy-dettaglio');
            text_detail.forEach((element) => {
              if (!element.classList.contains('show')) {
                element.classList.add('show');
              }
            });
            // Seleziona tutti i link per aprire i dettagli dell'epigrafia e li aggiorna
            let a_link = document.querySelectorAll(
              'a[data-target="#epigraphy-dettaglio"]'
            );
            a_link.forEach((element) => {
              if (element.classList.contains('collapsed')) {
                element.classList.remove('collapsed');
              }
            });
          }, 100);
        }
      }
    );

    // Sottoscrizione all'aggiornamento dei dati relativi all'epigrafia
    this.subscription = this.documentService.epigraphyData$.subscribe(
      (object) => {
        if (object != null) {
          // Ritarda l'aggiornamento dei tab per assicurarsi che i dati siano stati aggiornati
          setTimeout(() => {
            // Seleziona tutti i link dei tab e aggiorna la loro visualizzazione in base ai dati
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a');
            this.object = object;
            navTabLinks.forEach((element) => {
              if (element.text == 'Epigraphy') {
                element.classList.add('active');
              } else {
                element.classList.remove('active');
              }
            });

            // Seleziona tutti i contenuti dei tab e aggiorna la loro visualizzazione in base ai dati
            var navContent =
              this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            navContent.forEach((element) => {
              if (element.id == 'epigraphy') {
                element.classList.add('active');
                element.classList.add('show');
              } else {
                element.classList.remove('active');
                element.classList.remove('show');
              }
            });
          }, 200);
        } else {
          // Se non sono disponibili dati sull'epigrafia, reimposta i valori
          this.object = null;
          setTimeout(() => {
            // Reimposta la visualizzazione dei tab e dei relativi contenuti
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a');
            this.object = object;
            navTabLinks.forEach((element) => {
              if (element.text == 'Epigraphy') {
                element.classList.remove('active');
              }
            });

            var navContent =
              this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            navContent.forEach((element) => {
              if (element.id == 'epigraphy') {
                element.classList.remove('active');
                element.classList.remove('show');
              }
            });
          }, 200);
        }
      }
    );
  }

  /**
   * Questo metodo gestisce l'espansione o la contrazione della sezione epigrafica
   * in base allo stato dei tab e dei pannelli relativi alla modifica e all'epigrafia.
   * Si occupa di aprire o chiudere la sezione epigrafica in base alla situazione attuale.
   */
  triggerExpansionEpigraphy() {
    // Ritarda l'operazione per assicurarsi che altri processi abbiano completato le loro operazioni
    setTimeout(() => {
      // Verifica lo stato dei tab e dei pannelli relativi alla modifica e all'epigrafia
      if (!this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()) {
        if (
          !this.exp.isEditTabExpanded() &&
          this.exp.isEpigraphyTabExpanded()
        ) {
          // Se solo la sezione epigrafica è aperta e espansa, la chiude
          this.exp.openCollapseEpigraphy();
          this.exp.expandCollapseEpigraphy();
        }
      } else if (!this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()) {
        if (
          !this.exp.isEditTabExpanded() &&
          !this.exp.isEpigraphyTabExpanded()
        ) {
          // Se entrambe le sezioni sono chiuse e non espandibili, apre la sezione epigrafica
          this.exp.openCollapseEpigraphy();
          this.exp.expandCollapseEpigraphy();
        }
      } else if (this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()) {
        // Se entrambe le sezioni sono aperte, chiude la sezione epigrafica e espande la sezione di modifica
        this.exp.openCollapseEpigraphy();
        this.exp.expandCollapseEdit(true);
      } else if (this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()) {
        if (
          this.exp.isEditTabExpanded() &&
          !this.exp.isEpigraphyTabExpanded()
        ) {
          // Se solo la sezione di modifica è aperta e espansa, chiude la sezione epigrafica
          // e ripristina la visualizzazione della sezione di modifica
          this.exp.expandCollapseEdit(false);
          this.exp.openCollapseEpigraphy(true);
        }
      }
    }, 200);
  }

  /**
   * Questo metodo viene chiamato quando il componente viene distrutto.
   * Si occupa di disiscriversi dagli eventi a cui è stato precedentemente sottoscritto
   * per evitare memory leak.
   */
  ngOnDestroy(): void {
    // Disiscrizione dagli eventi
    this.subscription.unsubscribe();
    this.open_epigraphy_subscription.unsubscribe();
  }
}
