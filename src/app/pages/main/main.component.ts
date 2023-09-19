import { Component } from '@angular/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  onInputFileChange(e: any): void {
    console.log('onInputFileChange', e);
  }

  onInputFileInput(e: any): void {
    console.log('onInputFileInput', e);
  }
}
