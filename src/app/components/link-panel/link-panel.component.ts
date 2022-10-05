/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-link-panel',
  templateUrl: './link-panel.component.html',
  styleUrls: ['./link-panel.component.scss']
})
export class LinkPanelComponent implements OnInit, OnDestroy {

  @Input() linkData: any[] | any;
  
  seeAlsoData : {};
  sameAsData : {};
  counterElement = 0;
  object : any;

  refresh_subscription : Subscription;

  constructor(private lexicalService: LexicalEntriesService) { }

  ngOnInit(): void {

    this.refresh_subscription = this.lexicalService.refreshLinkCounter$.subscribe(
      data=>{
        console.log(data)
        if(data!=null){
          this.counterElement = eval(this.counterElement.toString()+data)
        }
      },error=>{
        console.log(error)
      }
    )
  }

  async ngOnChanges(changes: SimpleChanges){
    if(changes.linkData.currentValue != null){
      this.counterElement = 0;
      this.object = changes.linkData.currentValue;
      this.sameAsData = null;
      this.seeAlsoData = null;
      let lexicalElementId = '';
      let instanceNameType = '';
      let parameters = {};
      if (this.object.lexicalEntryInstanceName != undefined) {
        lexicalElementId = this.object.lexicalEntryInstanceName;
        instanceNameType = 'lexicalEntryInstanceName'
      } else if (this.object.formInstanceName != undefined) {
        lexicalElementId = this.object.formInstanceName;
        instanceNameType = 'formInstanceName'
      } else if (this.object.senseInstanceName != undefined) {
        lexicalElementId = this.object.senseInstanceName;
        instanceNameType = 'senseInstanceName'
      } else if (this.object.etymologyInstanceName != undefined) {
        lexicalElementId = this.object.etymologyInstanceName;
        instanceNameType = 'etymologyInstanceName'
      }
      /* //console.log(changes.linkData.currentValue) */


      try{
        let same_as_data = await this.lexicalService.getLexEntryLinguisticRelation(lexicalElementId, 'sameAs').toPromise()
        console.log(same_as_data)
        this.sameAsData = {}
        this.sameAsData['array'] = same_as_data;
        if(instanceNameType == 'lexicalEntryInstanceName'){
          this.sameAsData['parentNodeLabel']= this.object['lexicalEntry'];
        }
        this.sameAsData[instanceNameType]= this.object[instanceNameType];
        this.sameAsData['type'] = this.object.type;
      }catch(e){
        console.log(this.object)
        this.sameAsData = {}
        this.sameAsData['array'] = [];
        if(instanceNameType == 'lexicalEntryInstanceName'){
          this.sameAsData['parentNodeLabel']= this.object['lexicalEntry'];
        }
        this.sameAsData[instanceNameType]= this.object[instanceNameType];
        this.sameAsData['label']= this.object['label'];
        this.sameAsData['type'] = this.object.type;
        console.log(e);
      }
      
      try{
        let see_also_data = await this.lexicalService.getLexEntryLinguisticRelation(lexicalElementId, 'seeAlso').toPromise();
        console.log(see_also_data)
        this.seeAlsoData = {}
        this.seeAlsoData['array'] = see_also_data;
        this.seeAlsoData['parentNodeLabel']= this.object['lexicalEntry'];
        this.seeAlsoData[instanceNameType]= this.object[instanceNameType];
      }catch(e){
        this.seeAlsoData = {}
        this.seeAlsoData['array'] = [];
        this.seeAlsoData['parentNodeLabel']= this.object['lexicalEntry'];
        this.seeAlsoData[instanceNameType]= this.object[instanceNameType];
      }
      

      //console.log(this.object)
      this.object.links.forEach(element => {
        if(element.type != undefined){
          if(element.type == 'Reference'){
            element.elements.forEach(sub => {
              this.counterElement += sub.count;
            });
          }
        }
      });
    
      
    }else{
      this.counterElement = 0;
      this.sameAsData = null;
      this.seeAlsoData = null;
    }
  }

  
  ngOnDestroy(): void {
      this.refresh_subscription.unsubscribe();
  }
}
