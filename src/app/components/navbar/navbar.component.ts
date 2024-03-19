/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { KeycloakEventType, KeycloakService } from 'keycloak-angular';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  username: string;
  userRoles;

  kc_subscriber: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private keycloakService: KeycloakService,
    private auth: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    // Controlla se c'è un utente loggato
    if (this.auth.getLoggedUser() != undefined) {
      // Controlla se il nome utente preferito dell'utente loggato è definito
      if (this.auth.getLoggedUser()['preferred_username'] != undefined) {
        // Imposta il nome utente con il nome utente preferito dell'utente loggato
        this.username = this.auth.getLoggedUser()['preferred_username'];
      }
    }

    // Ottieni i ruoli dell'utente corrente
    this.userRoles = this.auth.getCurrentUserRole();

    // Sottoscrivi agli eventi di Keycloak
    this.kc_subscriber = this.keycloakService.keycloakEvents$.subscribe({
      next: (e) => {
        // Se l'evento è il token scaduto, aggiorna il token
        if (e.type == KeycloakEventType.OnTokenExpired) {
          this.keycloakService.updateToken(20);
        }
      },
    });
  }

  // Funzione per il logout
  logout() {
    this.auth.logout();
  }

  // Funzione per verificare se l'utente è un amministratore
  isAdmin = () => {
    let admin = (element) => element == 'ADMIN';
    console.log(this.userRoles.some(admin));
  };

  ngOnDestroy(): void {
    // Disiscrivi dalla sottoscrizione agli eventi di Keycloak durante la distruzione del componente
    this.kc_subscriber.unsubscribe();
  }

  // Ottieni la data e l'ora correnti
  getDateNow() {
    return new Date();
  }
}
