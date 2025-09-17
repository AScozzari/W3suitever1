import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Star,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  BarChart3,
  Clock,
  FileText,
  Settings
} from 'lucide-react';

interface PerformanceReview {
  id: string;
  employeeName: string;
  employeeId: string;
  reviewPeriod: string;
  reviewer: string;
  status: 'draft' | 'pending' | 'completed' | 'overdue';
  overallScore: number;
  lastUpdated: string;
  dueDate: string;
  goals: Goal[];
  competencies: Competency[];
}

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  dueDate: string;
}

interface Competency {
  id: string;
  name: string;
  score: number;
  feedback: string;
}

const reviewsData: PerformanceReview[] = [
  {
    id: '1',
    employeeName: 'Mario Rossi',
    employeeId: 'EMP001',
    reviewPeriod: 'Q4 2024',
    reviewer: 'Anna Ferretti',
    status: 'completed',
    overallScore: 4.7,
    lastUpdated: '2024-12-15',
    dueDate: '2024-12-31',
    goals: [
      {
        id: 'g1',
        title: 'Increase Sales Performance',
        description: 'Achieve 15% increase in quarterly sales',
        progress: 95,
        status: 'completed',
        dueDate: '2024-12-31'
      },
      {
        id: 'g2',
        title: 'Team Leadership Development',
        description: 'Complete advanced leadership training',
        progress: 80,
        status: 'in_progress',
        dueDate: '2025-01-15'
      }
    ],
    competencies: [
      { id: 'c1', name: 'Leadership', score: 4.8, feedback: 'Excellent leadership skills demonstrated' },
      { id: 'c2', name: 'Communication', score: 4.5, feedback: 'Strong communication abilities' },
      { id: 'c3', name: 'Problem Solving', score: 4.6, feedback: 'Creative solutions to challenges' }
    ]
  },
  {
    id: '2',
    employeeName: 'Laura Bianchi',
    employeeId: 'EMP002',
    reviewPeriod: 'Q4 2024',
    reviewer: 'Mario Rossi',
    status: 'pending',
    overallScore: 4.2,
    lastUpdated: '2024-12-10',
    dueDate: '2024-12-20',
    goals: [
      {
        id: 'g3',
        title: 'Customer Satisfaction Improvement',
        description: 'Improve customer satisfaction scores by 10%',
        progress: 75,
        status: 'in_progress',
        dueDate: '2024-12-31'
      }
    ],
    competencies: [
      { id: 'c4', name: 'Customer Service', score: 4.3, feedback: 'Strong customer relationship skills' },
      { id: 'c5', name: 'Product Knowledge', score: 4.0, feedback: 'Good product understanding' }
    ]
  },
  {
    id: '3',
    employeeName: 'Giuseppe Verde',
    employeeId: 'EMP003',
    reviewPeriod: 'Q4 2024',
    reviewer: 'Francesco Neri',
    status: 'overdue',
    overallScore: 3.8,
    lastUpdated: '2024-11-30',
    dueDate: '2024-12-15',
    goals: [
      {
        id: 'g4',
        title: 'Technical Skills Enhancement',
        description: 'Complete advanced technical certification',
        progress: 45,
        status: 'at_risk',
        dueDate: '2024-12-31'
      }
    ],
    competencies: [
      { id: 'c6', name: 'Technical Expertise', score: 3.8, feedback: 'Solid technical foundation' },
      { id: 'c7', name: 'Learning Agility', score: 3.7, feedback: 'Good adaptation to new technologies' }
    ]
  }
];

export default function PerformanceReviews() {
  const [currentModule, setCurrentModule] = useState<string>('performance-reviews');
  const [activeTab, setActiveTab] = useState('reviews');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);

  const filteredReviews = reviewsData.filter(review => {
    const matchesSearch = review.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || review.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="performance-reviews-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Performance Reviews
              </h1>
              <p className="text-gray-600">
                Employee performance evaluation and goal management system
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export Reports
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-new-review">
                <Plus className="h-4 w-4 mr-2" />
                New Review
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{reviewsData.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {reviewsData.filter(r => r.status === 'completed').length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {reviewsData.filter(r => r.status === 'overdue').length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(reviewsData.reduce((sum, r) => sum + r.overallScore, 0) / reviewsData.length).toFixed(1)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                  <Star className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-3">
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <ClipboardList className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="goals" data-testid="tab-goals">
              <Target className="h-4 w-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Performance Reviews</CardTitle>
                    <CardDescription>Manage employee performance evaluations</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-orange-500"
                        data-testid="input-search"
                      />
                    </div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid="select-status"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="draft">Draft</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 border border-gray-200 rounded-lg bg-white/50 backdrop-blur hover:shadow-lg transition-all"
                      data-testid={`review-card-${review.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {review.employeeName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{review.employeeName}</h3>
                            <p className="text-sm text-gray-600">{review.reviewPeriod} • Reviewer: {review.reviewer}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Star className={`h-5 w-5 ${getScoreColor(review.overallScore)}`} />
                              <span className={`text-lg font-bold ${getScoreColor(review.overallScore)}`}>
                                {review.overallScore.toFixed(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">Overall Score</p>
                          </div>
                          <Badge className={getStatusColor(review.status)}>
                            {review.status}
                          </Badge>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-view-${review.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${review.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Goals Progress */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Goals Progress</h4>
                        <div className="space-y-2">
                          {review.goals.map((goal) => (
                            <div key={goal.id} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">{goal.title}</span>
                                  <span className="text-sm text-gray-500">{goal.progress}%</span>
                                </div>
                                <Progress value={goal.progress} className="h-2" />
                              </div>
                              <Badge className={getGoalStatusColor(goal.status)} variant="outline">
                                {goal.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <span>Last updated: {review.lastUpdated}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Due: {review.dueDate}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    Active Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviewsData.flatMap(review => review.goals)
                      .filter(goal => goal.status !== 'completed')
                      .map((goal) => (
                        <div key={goal.id} className="p-4 border border-gray-200 rounded-lg bg-white/50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{goal.title}</h4>
                            <Badge className={getGoalStatusColor(goal.status)}>
                              {goal.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} />
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>Due: {goal.dueDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Completed Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviewsData.flatMap(review => review.goals)
                      .filter(goal => goal.status === 'completed')
                      .map((goal) => (
                        <div key={goal.id} className="p-4 border border-gray-200 rounded-lg bg-green-50/50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{goal.title}</h4>
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Completed: {goal.dueDate}</span>
                            <span className="text-green-600 font-medium">100%</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">85%</p>
                        <p className="text-sm text-gray-600">Reviews Completed</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">4.3</p>
                        <p className="text-sm text-gray-600">Avg Performance</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">72%</p>
                        <p className="text-sm text-gray-600">Goals Achieved</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">92%</p>
                        <p className="text-sm text-gray-600">On-time Reviews</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-orange-600" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reviewsData
                      .sort((a, b) => b.overallScore - a.overallScore)
                      .slice(0, 5)
                      .map((review, index) => (
                        <div key={review.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium">{review.employeeName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className={`h-4 w-4 ${getScoreColor(review.overallScore)}`} />
                            <span className={`font-medium ${getScoreColor(review.overallScore)}`}>
                              {review.overallScore.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
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