import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-concept-set-core-form',
  templateUrl: './concept-set-core-form.component.html',
  styleUrls: ['./concept-set-core-form.component.scss']
})
export class ConceptSetCoreFormComponent implements OnInit {

  @Input() conceptSetData: any;
  object : any;
  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.conceptSetData.currentValue) {
        /* this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
        this.morphoTraits.clear();

        this.denotesArray = this.coreForm.get('denotes') as FormArray;
        this.denotesArray.clear();

        this.cognatesArray = this.coreForm.get('cognates') as FormArray;
        this.cognatesArray.clear();

        this.evokesArray = this.coreForm.get('evokes') as FormArray;
        this.evokesArray.clear();

        this.disableAddCognates = false;
        this.disableAddDenotes = false;
        this.disableAddMorpho = false;

        this.subtermArray = this.coreForm.get('subterm') as FormArray;
        this.subtermArray.clear();

        this.memoryStem = '';
        this.memoryPos = '';

        this.staticMorpho = []

        this.memorySubterm = [];
        this.isMultiword = false; */
      }
      this.object = changes.conceptSetData.currentValue;


      if (this.object != null) {

        // const lexId = this.object.lexicalEntry;
        // this.coreForm.get('label').setValue(this.object.label, { emitEvent: false });
        // this.coreForm.get('stemType').setValue(this.object.stemType, { emitEvent: false });
        // if (this.object.stemType != '') {
        //   this.memoryStem = this.object.stemType;
        // }
        // if (this.object.type == 'Etymon') {
        //   this.coreForm.get('type').disable({ onlySelf: true, emitEvent: false })
        // } else {
        //   this.coreForm.get('type').enable({ onlySelf: true, emitEvent: false })
        // }

        // if (this.object.confidence == 0) {
        //   //spento se null o 1
        //   //acceso se 0
        //   this.coreForm.get('confidence').patchValue(true, { emitEvent: false });
        // } else {
        //   this.coreForm.get('confidence').setValue(null, { emitEvent: false });
        // }


        // this.object.type.forEach(element => {
        //   if (element != 'Cognate') {
        //     this.coreForm.get('type').setValue(element, { emitEvent: false });
        //     return true;
        //   } else {
        //     return false;
        //   }
        // });

        // let isCognate = this.object.type.find(element => element == 'Cognate');
        // this.isMultiword = this.object.type.some(element => element == 'MultiWordExpression');
        // if (this.isMultiword) {
        //   this.getSubterms(lexId);
        // }
        // if (isCognate) {
        //   this.coreForm.get('isCognate').setValue(true, { emitEvent: false })
        // } else {
        //   this.coreForm.get('isCognate').setValue(false, { emitEvent: false })
        // }

        // let isEtymon = this.object.type.find(element => element == 'Etymon');
        // if (isEtymon) {
        //   this.coreForm.get('isEtymon').setValue(true, { emitEvent: false })
        // } else {
        //   this.coreForm.get('isEtymon').setValue(false, { emitEvent: false })
        // }

        // //this.coreForm.get('type').setValue(this.object.type, { emitEvent: false });
        // this.coreForm.get('language').setValue(this.object.language, { emitEvent: false });
        // this.coreForm.get('pos').setValue(this.object.pos, { emitEvent: false });

        // this.memoryPos = this.object.pos;

        // this.valueTraits = [];
        // this.memoryTraits = [];
        // this.memoryDenotes = [];
        // this.memoryCognates = [];
        // this.memoryValues = [];
        // this.memoryConfidence = null;

        
      }


    }, 10)

  }

}
