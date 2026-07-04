import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
})
export class LoadingComponent {
  @Input() texto = 'Carregando...';
}
