import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-sense-tab',
  templateUrl: './sense-tab.component.html',
  styleUrls: ['./sense-tab.component.scss']
})
export class SenseTabComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    setTimeout(() => {
      //@ts-ignore
      $('.sense-tooltip').tooltip({
        trigger : 'click',
      });
    }, 1000);
  }

}
