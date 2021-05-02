import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries.service';
import { DataService, Person } from '../lexical-entry-core-form/data.service';

@Component({
  selector: 'app-sense-core-form',
  templateUrl: './sense-core-form.component.html',
  styleUrls: ['./sense-core-form.component.scss']
})
export class SenseCoreFormComponent implements OnInit {

  @Input() senseData: any;

  switchInput = false;
  subscription: Subscription;
  object: any;
  people: Person[] = [];
  peopleLoading = false;
  counter = 0;
  
  senseCore = new FormGroup({
    definition : new FormControl(''),
    example : new FormControl(''),
    usage : new FormControl(''),
    reference : new FormArray([this.createReference()]),
    lexical_concept : new FormArray([this.createLexicalConcept()]),
    sense_of : new FormControl('')
  })

  lexicalConceptArray : FormArray;

  constructor(private dataService: DataService, private lexicalService: LexicalEntriesService, private formBuilder: FormBuilder) { }

  ngOnInit() {
    setTimeout(() => {
      //@ts-ignore
      $('.denotes-tooltip').tooltip({
        trigger: 'hover'
      });
    }, 1000);
    this.loadPeople();

    this.senseCore = this.formBuilder.group({
      definition : '',
      example : '',
      usage : '',
      reference : this.formBuilder.array([this.createReference()]),
      lexical_concept : this.formBuilder.array([this.createLexicalConcept()]),
      sense_of : ''
    })

    this.onChanges();

  }

  private loadPeople() {
    this.peopleLoading = true;
    this.dataService.getPeople().subscribe(x => {
        this.people = x;
        this.peopleLoading = false;
    });
}

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.formData.currentValue) {
        
      }
      this.object = changes.formData.currentValue;
      console.log(this.object)
      if (this.object != null) {
        
      }
    }, 10)

  }

  onChanges(): void {
    this.senseCore.valueChanges.pipe(debounceTime(200)).subscribe(searchParams => {
      console.log(searchParams)
    })
  }

  createReference(){
    return this.formBuilder.group({
      entity: ''
    })
  }

  removeReference(index){
    const referenceArray = this.senseCore.get('reference') as FormArray;
    referenceArray.removeAt(index)
  }

  createLexicalConcept(){
    return this.formBuilder.group({
      lex_concept: ''
    })
  }

  addLexicalConcept(){
    this.lexicalConceptArray = this.senseCore.get('lexical_concept') as FormArray;
    this.lexicalConceptArray.push(this.createLexicalConcept());
  }

  removeLexicalConcept(index){
    this.lexicalConceptArray = this.senseCore.get('lexical_concept') as FormArray;
    this.lexicalConceptArray.removeAt(index);
  }
}
