declare module 'jstat' {
  export interface JStatStatic {
    normal: {
      inv(p: number, mean: number, std: number): number;
      cdf(x: number, mean: number, std: number): number;
      pdf(x: number, mean: number, std: number): number;
    };
    chisquare: {
      cdf(x: number, dof: number): number;
      inv(p: number, dof: number): number;
    };
    studentt: {
      cdf(x: number, dof: number): number;
      inv(p: number, dof: number): number;
    };
  }

  export const jStat: JStatStatic;
  export default jStat;
}
