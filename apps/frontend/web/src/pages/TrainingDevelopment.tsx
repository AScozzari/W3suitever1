import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Award,
  Users,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  FileText,
  Download,
  Upload,
  Settings,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Star,
  GraduationCap,
  Video,
  Presentation,
  BarChart3
} from 'lucide-react';

interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'leadership' | 'compliance' | 'soft_skills' | 'safety';
  duration: number; // in hours
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor: string;
  enrolledCount: number;
  completionRate: number;
  rating: number;
  status: 'active' | 'draft' | 'archived';
  startDate: string;
  endDate: string;
  isMandatory: boolean;
}

interface EmployeeTraining {
  id: string;
  employeeName: string;
  employeeId: string;
  programTitle: string;
  progress: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'overdue' | 'not_started';
  completionDate?: string;
  score?: number;
  certificateIssued: boolean;
}

interface Certificate {
  id: string;
  employeeName: string;
  programTitle: string;
  issueDate: string;
  expiryDate?: string;
  certificateNumber: string;
  status: 'active' | 'expired' | 'expiring_soon';
}

const trainingPrograms: TrainingProgram[] = [
  {
    id: '1',
    title: 'Customer Service Excellence',
    description: 'Advanced customer service techniques and conflict resolution',
    category: 'soft_skills',
    duration: 16,
    level: 'intermediate',
    instructor: 'Anna Ferretti',
    enrolledCount: 45,
    completionRate: 78,
    rating: 4.6,
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-03-15',
    isMandatory: true
  },
  {
    id: '2',
    title: 'Leadership Development Program',
    description: 'Comprehensive leadership skills for team managers',
    category: 'leadership',
    duration: 40,
    level: 'advanced',
    instructor: 'Roberto Conti',
    enrolledCount: 28,
    completionRate: 85,
    rating: 4.8,
    status: 'active',
    startDate: '2024-02-01',
    endDate: '2024-06-01',
    isMandatory: false
  },
  {
    id: '3',
    title: 'Workplace Safety Training',
    description: 'Essential safety protocols and emergency procedures',
    category: 'safety',
    duration: 8,
    level: 'beginner',
    instructor: 'Giuseppe Verde',
    enrolledCount: 156,
    completionRate: 95,
    rating: 4.4,
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    isMandatory: true
  },
  {
    id: '4',
    title: 'Digital Marketing Fundamentals',
    description: 'Modern digital marketing strategies and tools',
    category: 'technical',
    duration: 24,
    level: 'intermediate',
    instructor: 'Laura Bianchi',
    enrolledCount: 32,
    completionRate: 67,
    rating: 4.3,
    status: 'active',
    startDate: '2024-03-01',
    endDate: '2024-05-01',
    isMandatory: false
  },
  {
    id: '5',
    title: 'GDPR Compliance Training',
    description: 'Data protection regulations and compliance requirements',
    category: 'compliance',
    duration: 6,
    level: 'beginner',
    instructor: 'Francesco Neri',
    enrolledCount: 123,
    completionRate: 89,
    rating: 4.2,
    status: 'active',
    startDate: '2024-01-10',
    endDate: '2024-12-31',
    isMandatory: true
  }
];

const employeeTrainingData: EmployeeTraining[] = [
  {
    id: '1',
    employeeName: 'Mario Rossi',
    employeeId: 'EMP001',
    programTitle: 'Customer Service Excellence',
    progress: 85,
    status: 'in_progress',
    score: undefined,
    certificateIssued: false
  },
  {
    id: '2',
    employeeName: 'Laura Bianchi',
    employeeId: 'EMP002',
    programTitle: 'Leadership Development Program',
    progress: 100,
    status: 'completed',
    completionDate: '2024-12-10',
    score: 92,
    certificateIssued: true
  },
  {
    id: '3',
    employeeName: 'Giuseppe Verde',
    employeeId: 'EMP003',
    programTitle: 'Workplace Safety Training',
    progress: 100,
    status: 'completed',
    completionDate: '2024-11-25',
    score: 88,
    certificateIssued: true
  },
  {
    id: '4',
    employeeName: 'Anna Ferretti',
    employeeId: 'EMP004',
    programTitle: 'GDPR Compliance Training',
    progress: 45,
    status: 'in_progress',
    score: undefined,
    certificateIssued: false
  },
  {
    id: '5',
    employeeName: 'Francesco Neri',
    employeeId: 'EMP005',
    programTitle: 'Digital Marketing Fundamentals',
    progress: 0,
    status: 'enrolled',
    score: undefined,
    certificateIssued: false
  }
];

const certificatesData: Certificate[] = [
  {
    id: '1',
    employeeName: 'Laura Bianchi',
    programTitle: 'Leadership Development Program',
    issueDate: '2024-12-10',
    expiryDate: '2026-12-10',
    certificateNumber: 'LDP-2024-001',
    status: 'active'
  },
  {
    id: '2',
    employeeName: 'Giuseppe Verde',
    programTitle: 'Workplace Safety Training',
    issueDate: '2024-11-25',
    expiryDate: '2025-11-25',
    certificateNumber: 'WST-2024-012',
    status: 'active'
  },
  {
    id: '3',
    employeeName: 'Mario Rossi',
    programTitle: 'Customer Service Excellence',
    issueDate: '2023-12-15',
    expiryDate: '2024-12-15',
    certificateNumber: 'CSE-2023-045',
    status: 'expired'
  }
];

export default function TrainingDevelopment() {
  const [currentModule, setCurrentModule] = useState<string>('training-development');
  const [activeTab, setActiveTab] = useState('programs');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredPrograms = trainingPrograms.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || program.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || program.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'leadership': return 'bg-purple-100 text-purple-800';
      case 'compliance': return 'bg-red-100 text-red-800';
      case 'soft_skills': return 'bg-green-100 text-green-800';
      case 'safety': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'enrolled': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="training-development-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Training & Development
              </h1>
              <p className="text-gray-600">
                Employee learning programs, certifications, and skill development
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-import">
                <Upload className="h-4 w-4 mr-2" />
                Import Content
              </Button>
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-reports">
                <Download className="h-4 w-4 mr-2" />
                Training Reports
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-create-program">
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Training Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Programs</p>
                  <p className="text-2xl font-bold text-gray-900">{trainingPrograms.filter(p => p.status === 'active').length}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">+3 this month</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {trainingPrograms.reduce((sum, program) => sum + program.enrolledCount, 0)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-600">Across all programs</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(trainingPrograms.reduce((sum, program) => sum + program.completionRate, 0) / trainingPrograms.length)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">+5% improvement</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Certificates Issued</p>
                  <p className="text-2xl font-bold text-gray-900">{certificatesData.filter(c => c.status === 'active').length}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Award className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-600">This quarter</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-4">
            <TabsTrigger value="programs" data-testid="tab-programs">
              <BookOpen className="h-4 w-4 mr-2" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">
              <BarChart3 className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              <Award className="h-4 w-4 mr-2" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Programs Tab */}
          <TabsContent value="programs">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Training Programs</CardTitle>
                    <CardDescription>Manage and monitor training programs</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search programs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-orange-500"
                        data-testid="input-search"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid="select-category"
                    >
                      <option value="all">All Categories</option>
                      <option value="technical">Technical</option>
                      <option value="leadership">Leadership</option>
                      <option value="compliance">Compliance</option>
                      <option value="soft_skills">Soft Skills</option>
                      <option value="safety">Safety</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredPrograms.map((program) => (
                    <motion.div
                      key={program.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 border border-gray-200 rounded-lg bg-white/50 backdrop-blur hover:shadow-lg transition-all"
                      data-testid={`program-card-${program.id}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{program.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">{program.description}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge className={getCategoryColor(program.category)}>
                              {program.category.replace('_', ' ')}
                            </Badge>
                            <Badge className={getLevelColor(program.level)}>
                              {program.level}
                            </Badge>
                            <Badge className={getStatusColor(program.status)}>
                              {program.status}
                            </Badge>
                            {program.isMandatory && (
                              <Badge className="bg-red-100 text-red-800">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-view-${program.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${program.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Clock className="h-4 w-4" />
                            <span>{program.duration} hours</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Users className="h-4 w-4" />
                            <span>{program.enrolledCount} enrolled</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <GraduationCap className="h-4 w-4" />
                            <span>{program.instructor}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Target className="h-4 w-4" />
                            <span>{program.completionRate}% completion</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{program.rating.toFixed(1)} rating</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{program.startDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completion Progress</span>
                          <span>{program.completionRate}%</span>
                        </div>
                        <Progress value={program.completionRate} className="h-2" />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Start Training
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Enrollments
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Employee Training Progress</CardTitle>
                <CardDescription>Track individual employee training progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Program</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Progress</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Score</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Certificate</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeTrainingData.map((training) => (
                        <tr key={training.id} className="border-b border-gray-100 hover:bg-gray-50/50" data-testid={`training-row-${training.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {training.employeeName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-medium text-gray-900">{training.employeeName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium">{training.programTitle}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-[80px]">
                                <Progress value={training.progress} className="h-2" />
                              </div>
                              <span className="text-sm font-medium">{training.progress}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(training.status)}>
                              {training.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {training.score ? (
                              <span className={`font-medium ${getScoreColor(training.score)}`}>
                                {training.score}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {training.certificateIssued ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-progress-${training.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-progress-${training.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {certificatesData.map((certificate) => (
                <motion.div
                  key={certificate.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  data-testid={`certificate-card-${certificate.id}`}
                >
                  <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all">
                    <CardContent className="p-6">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Award className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{certificate.programTitle}</h3>
                        <p className="text-sm text-gray-600">{certificate.employeeName}</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Certificate No.</span>
                          <span className="font-medium">{certificate.certificateNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Issue Date</span>
                          <span className="font-medium">{certificate.issueDate}</span>
                        </div>
                        {certificate.expiryDate && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Expiry Date</span>
                            <span className="font-medium">{certificate.expiryDate}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Status</span>
                          <Badge className={getStatusColor(certificate.status)}>
                            {certificate.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Download Certificate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Training Effectiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">85%</p>
                        <p className="text-sm text-gray-600">Avg Completion Rate</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">4.5</p>
                        <p className="text-sm text-gray-600">Avg Program Rating</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Completion by Category</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Safety Training</span>
                          <span className="text-sm font-medium">95%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Compliance</span>
                          <span className="text-sm font-medium">89%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Leadership</span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Technical Skills</span>
                          <span className="text-sm font-medium">67%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-orange-600" />
                    Certification Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">245</p>
                        <p className="text-sm text-gray-600">Active Certificates</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">12</p>
                        <p className="text-sm text-gray-600">Expiring Soon</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Certificate Distribution</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Safety Certificates</span>
                          <span className="text-sm font-medium">156</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Leadership Certificates</span>
                          <span className="text-sm font-medium">45</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Technical Certificates</span>
                          <span className="text-sm font-medium">32</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Compliance Certificates</span>
                          <span className="text-sm font-medium">123</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}