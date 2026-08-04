export type MockPaper = {
  id: number;
  title: string;
  authors: string[];
  views: number;
  downloads: number;
  citations: number;
  year: number;
  discipline: string;
  university: string;
  rating?: number;
  abstract: string;
};

export const mockPapers: MockPaper[] = [
  { id: 1, title: 'Advanced AI in Healthcare: Deep Learning Applications', authors: ['Dr. Smith', 'Dr. Johnson'], downloads: 512, views: 2341, citations: 45, year: 2024, discipline: 'Computer Science', university: 'MIT', rating: 4.8, abstract: 'Exploring deep learning applications in medical diagnosis and treatment planning.' },
  { id: 2, title: 'Quantum Computing Applications in Optimization', authors: ['Prof. Lee'], downloads: 234, views: 1823, citations: 28, year: 2023, discipline: 'Physics', university: 'Stanford', rating: 4.6, abstract: 'A comprehensive study of quantum algorithms for solving optimization problems.' },
  { id: 3, title: 'Sustainable Energy Solutions for Urban Development', authors: ['Dr. Chen', 'Dr. Patel'], downloads: 891, views: 3452, citations: 67, year: 2024, discipline: 'Engineering', university: 'UC Berkeley', rating: 4.9, abstract: 'Innovative approaches to renewable energy integration in smart cities.' },
  { id: 4, title: 'Machine Learning in Financial Risk Assessment', authors: ['Prof. Brown'], downloads: 445, views: 2156, citations: 52, year: 2023, discipline: 'Computer Science', university: 'Harvard', rating: 4.7, abstract: 'Machine learning models for predicting financial risk and market trends.' },
  { id: 5, title: 'Blockchain Security Analysis and Best Practices', authors: ['Dr. Martinez'], downloads: 234, views: 1567, citations: 19, year: 2024, discipline: 'Computer Science', university: 'Oxford', rating: 4.5, abstract: 'Security vulnerabilities and mitigation strategies in blockchain systems.' },
  { id: 6, title: 'Climate Change Mitigation Through Carbon Capture', authors: ['Prof. Wilson', 'Dr. Garcia'], downloads: 1023, views: 4123, citations: 89, year: 2024, discipline: 'Environmental Science', university: 'Cambridge', rating: 4.9, abstract: 'Advanced techniques for capturing and storing atmospheric carbon dioxide.' },
  { id: 7, title: 'Advanced Materials for Next Generation Computing', authors: ['Dr. Kumar', 'Prof. Anderson'], downloads: 389, views: 1945, citations: 34, year: 2023, discipline: 'Physics', university: 'MIT', rating: 4.6, abstract: 'Exploring new semiconductor materials for quantum computing applications.' },
  { id: 8, title: 'Artificial Intelligence in Drug Discovery', authors: ['Dr. Thompson'], downloads: 678, views: 2834, citations: 56, year: 2024, discipline: 'Medicine', university: 'Harvard', rating: 4.8, abstract: 'AI-powered approaches accelerating pharmaceutical research and development.' },
  { id: 9, title: 'Renewable Energy Storage Technologies', authors: ['Dr. Hassan', 'Prof. Lee'], downloads: 567, views: 3100, citations: 71, year: 2024, discipline: 'Engineering', university: 'Stanford', rating: 4.7, abstract: 'Battery and hydrogen storage solutions for renewable energy integration.' },
];

export function findPaperById(id: number): MockPaper | undefined {
  return mockPapers.find(p => p.id === id);
}
