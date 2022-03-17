import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-lexicon-page',
  templateUrl: './lexicon-page.component.html',
  styleUrls: ['./lexicon-page.component.scss']
})
export class LexiconPageComponent implements OnInit {
  subscription: Subscription;
  object: any;
  @ViewChild('accordion') accordion: ElementRef; 

  constructor(private lexicalService: LexicalEntriesService, private biblioService : BibliographyService) { }

  notes = '';
  link = [];
  bibliography = [];
  attestation : any;
  ngOnInit(): void {

    this.lexicalService.triggerNotePanel$.subscribe(
      boolean => {
        if(boolean != null){
          if(boolean){
            let a_link = this.accordion.nativeElement.querySelectorAll('a[data-target="#noteCollapse"]');
            let collapse_container = this.accordion.nativeElement.querySelectorAll('div[aria-labelledby="noteHeading"]');
            let item_collapse = this.accordion.nativeElement.querySelectorAll('[id^="collapse-"');
            a_link.forEach(element => {
              if(element.classList.contains("collapsed")){
                element.classList.remove('collapsed')
              }else{
                //element.classList.add('collapsed')
              }
            })

            collapse_container.forEach(element => {
              if(element.classList.contains("show")){
                //element.classList.remove('collapsed')
              }else{
                element.classList.add('show')
              }
            })

            item_collapse.forEach(element => {
              if(element == item_collapse[item_collapse.length-1]){
                element.classList.add('show')
              }else{
                element.classList.remove('show')
              }
            });
          }else{
            setTimeout(() => {
              let a_link = this.accordion.nativeElement.querySelectorAll('a[data-target="#noteCollapse"]');
              a_link.forEach(element => {
                element.classList.add('collapsed')
                
              })

              let collapse_container = this.accordion.nativeElement.querySelectorAll('div[aria-labelledby="noteHeading"]');
              collapse_container.forEach(element => {
                console.log(element)
                if(element.classList.contains("show")){
                  element.classList.remove('show')
                }
              })
            }, 100);
            
          }
        }
      }
    )

    this.lexicalService.triggerAttestationPanel$.subscribe(
      boolean => {
        if(boolean != undefined){
          if(boolean){
            let a_link = this.accordion.nativeElement.querySelectorAll('a[data-target="#attestationCollapse"]');
            let collapse_container = this.accordion.nativeElement.querySelectorAll('div[aria-labelledby="attestationHeading"]');
            let item_collapse = this.accordion.nativeElement.querySelectorAll('[id^="collapse-"');
            a_link.forEach(element => {
              if(element.classList.contains("collapsed")){
                element.classList.remove('collapsed')
              }else{
                //element.classList.add('collapsed')
              }
            })

            collapse_container.forEach(element => {
              if(element.classList.contains("show")){
                //element.classList.remove('collapsed')
              }else{
                element.classList.add('show')
              }
            })

            /* item_collapse.forEach(element => {
              if(element == item_collapse[item_collapse.length-1]){
                element.classList.add('show')
              }else{
                element.classList.remove('show')
              }
            }); */
          }else{
            setTimeout(() => {
              let a_link = this.accordion.nativeElement.querySelectorAll('a[data-target="#attestationCollapse"]');
              a_link.forEach(element => {
                element.classList.add('collapsed')
                
              })

              let collapse_container = this.accordion.nativeElement.querySelectorAll('div[aria-labelledby="attestationHeading"]');
              collapse_container.forEach(element => {
                console.log(element)
                if(element.classList.contains("show")){
                  element.classList.remove('show')
                }
              })
            }, 100);
            
          }
        }
      }
    )

    this.biblioService.triggerPanel$.subscribe(
      object => {
        if(object != undefined){
          let a_link = this.accordion.nativeElement.querySelectorAll('a[data-target="#bibliographyCollapse"]');
          let collapse_container = this.accordion.nativeElement.querySelectorAll('div[aria-labelledby="bibliographyHeading"]');
          let item_collapse = this.accordion.nativeElement.querySelectorAll('[id^="collapse-"');
          a_link.forEach(element => {
            if(element.classList.contains("collapsed")){
              element.classList.remove('collapsed')
            }else{
              //element.classList.add('collapsed')
            }
          })

          collapse_container.forEach(element => {
            if(element.classList.contains("show")){
              //element.classList.remove('collapsed')
            }else{
              element.classList.add('show')
            }
          })

          item_collapse.forEach(element => {
            if(element == item_collapse[item_collapse.length-1]){
              element.classList.add('show')
            }else{
              element.classList.remove('show')
            }
          });
        }
        
      }
    )

    this.lexicalService.attestationPanelData$.subscribe(
      data => {
        /* console.log(data) */
        if(data != null){
          if(Array.isArray(data)){
            this.attestation = data;
          }else{
            this.attestation = [data];
          }
        }
      }
    )

    this.lexicalService.rightPanelData$.subscribe(
      object => {
        this.object = object;
        /* console.log(this.object) */
        if(this.object !=null){
          if(this.object.etymology != undefined){
            this.notes = this.object['etymology'];
            this.link = this.object['etymology'];
            this.bibliography = this.object['etymology'];
          }else{
            this.notes = this.object;
            this.link = this.object;
            this.bibliography = this.object;
          }
        }else{
          this.notes = null;
          this.link = null;
          this.bibliography = null;
        }
      }
    );
  }

}
