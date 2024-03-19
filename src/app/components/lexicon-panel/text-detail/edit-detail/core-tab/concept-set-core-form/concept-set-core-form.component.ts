import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, pairwise, startWith, takeUntil } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-concept-set-core-form',
  templateUrl: './concept-set-core-form.component.html',
  styleUrls: ['./concept-set-core-form.component.scss'],
})
export class ConceptSetCoreFormComponent implements OnInit, OnDestroy {
  @Input() conceptSetData: any;
  object: any;

  destroy$: Subject<boolean> = new Subject();

  constructor(
    private formBuilder: FormBuilder,
    private conceptService: ConceptService,
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService
  ) {}

  conceptSetForm = new FormGroup({
    defaultLabel: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    // Inizializzazione del form per la modifica dell'etichetta predefinita
    this.conceptSetForm = this.formBuilder.group({
      defaultLabel: '', // Campo per l'etichetta predefinita
    });

    // Monitora i cambiamenti nel campo dell'etichetta predefinita
    this.onChanges();
  }

  // Gestisce i cambiamenti nel campo dell'etichetta predefinita
  onChanges() {
    this.conceptSetForm
      .get('defaultLabel')
      .valueChanges.pipe(
        debounceTime(3000), // Ritarda l'invio del valore per 3 secondi
        startWith(this.conceptSetForm.get('defaultLabel').value), // Inizia con il valore attuale del campo
        pairwise(), // Prende le coppie di valori precedente e successivo
        takeUntil(this.destroy$) // Smette di osservare se l'observable di distruzione emette un valore
      )
      .subscribe(([prev, next]: [any, any]) => {
        if (next != '') {
          // Controlla se il nuovo valore non è vuoto
          // Parametri per l'aggiornamento dell'etichetta SKOS
          let parameters = {
            relation: 'http://www.w3.org/2004/02/skos/core#prefLabel',
            source: this.object.conceptSet,
            target: next,
            oldTarget: prev == '' ? this.object.defaultLabel : prev,
            targetLanguage: this.object.language,
            oldTargetLanguage: this.object.language,
          };

          // Aggiorna l'etichetta SKOS
          this.conceptService
            .updateSkosLabel(parameters)
            .pipe(
              takeUntil(this.destroy$) // Smette di osservare se l'observable di distruzione emette un valore
            )
            .subscribe(
              (data) => {
                console.log(data); // Log dei dati
              },
              (error) => {
                console.log(error); // Log degli errori
                // Gestione degli errori
                if (error.status != 200) {
                  // Mostra un messaggio di errore
                  this.toastr.error(error.error, 'Errore', {
                    timeOut: 5000,
                  });
                } else {
                  const data = this.object;
                  data['request'] = 0;
                  data['new_label'] = next;
                  // Aggiorna la vista dopo la modifica
                  this.lexicalService.refreshAfterEdit(data);
                  this.lexicalService.spinnerAction('off'); // Disattiva lo spinner
                  this.lexicalService.updateCoreCard({
                    lastUpdate: error.error.text,
                  }); // Aggiorna la scheda principale
                  // Mostra un messaggio di successo
                  this.toastr.success(
                    'Etichetta modificata correttamente per ' +
                      this.object.conceptSet,
                    '',
                    {
                      timeOut: 5000,
                    }
                  );
                }
              }
            );
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.conceptSetData.currentValue) {
        // Logica varia in base al cambiamento dell'oggetto
      }
      this.object = changes.conceptSetData.currentValue;

      // Aggiorna il valore del campo dell'etichetta predefinita se l'oggetto non è nullo
      if (this.object != null) {
        let defaultLabel = this.object.defaultLabel;
        this.conceptSetForm
          .get('defaultLabel')
          .setValue(defaultLabel, { emitEvent: false });
      }
    }, 10);
  }

  ngOnDestroy(): void {
    // Completa l'observable di distruzione
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
