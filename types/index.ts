export interface Client {
  id: string;
  name: string;
}

export interface Loan {
  loanType: string;
  emi: number;
  balance: number;
}

export interface OSINT {
  summary: string;
  confidence: number;
}
